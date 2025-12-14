<?php
// backend/api/admin/admin_add_stats.php

require_once "../../config/db.php";
session_start();

header("Content-Type: application/json");

// Admin guard
if (empty($_SESSION["is_admin"])) {
    echo json_encode([
        "success" => false,
        "message" => "Admin access only"
    ]);
    exit;
}

// Handle CORS preflight (if browser sends OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---------- 0) READ & VALIDATE BODY ----------
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON body",
        "raw"     => $raw
    ]);
    exit;
}

$week_number = isset($data['week_number']) ? (int)$data['week_number'] : 0;
$stats       = (isset($data['stats']) && is_array($data['stats'])) ? $data['stats'] : [];

if ($week_number <= 0 || empty($stats)) {
    echo json_encode([
        "success" => false,
        "message" => "week_number and stats array required"
    ]);
    exit;
}

// ---------- 1) FANTASY FORMULA (PLAYER LEVEL) ----------
function calculate_fantasy_points($s) {
    $points    = isset($s['points'])    ? (int)$s['points']    : 0;
    $rebounds  = isset($s['rebounds'])  ? (int)$s['rebounds']  : 0;
    $assists   = isset($s['assists'])   ? (int)$s['assists']   : 0;
    $steals    = isset($s['steals'])    ? (int)$s['steals']    : 0;
    $blocks    = isset($s['blocks'])    ? (int)$s['blocks']    : 0;
    $turnovers = isset($s['turnovers']) ? (int)$s['turnovers'] : 0;

    $score = $points
           + 1.2 * $rebounds
           + 1.5 * $assists
           + 3   * $steals
           + 3   * $blocks
           - 1   * $turnovers;

    return (int) round($score);
}

// ---------- 2) ALWAYS INSERT INTO WEEKLY_STATS (NO UPDATE) ----------
$inserted = 0;

$insertSql = "
    INSERT INTO weekly_stats
    (player_id, week_number, match_id, points, rebounds, assists, steals, blocks, turnovers, minutes, fantasy_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
";

$ins = $conn->prepare($insertSql);
if (!$ins) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed (insert): " . $conn->error
    ]);
    exit;
}

foreach ($stats as $s) {
    $player_id = isset($s['player_id']) ? (int)$s['player_id'] : 0;
    if ($player_id <= 0) continue;

    $points    = isset($s['points'])    ? (int)$s['points']    : 0;
    $rebounds  = isset($s['rebounds'])  ? (int)$s['rebounds']  : 0;
    $assists   = isset($s['assists'])   ? (int)$s['assists']   : 0;
    $steals    = isset($s['steals'])    ? (int)$s['steals']    : 0;
    $blocks    = isset($s['blocks'])    ? (int)$s['blocks']    : 0;
    $turnovers = isset($s['turnovers']) ? (int)$s['turnovers'] : 0;
    $minutes   = isset($s['minutes'])   ? (int)$s['minutes']   : 0;

    // allow null match_id
    $match_id = (isset($s['match_id']) && $s['match_id'] !== null && $s['match_id'] !== "")
        ? (int)$s['match_id']
        : null;

    $fantasy_points = calculate_fantasy_points($s);

    $ins->bind_param(
        "iiiiiiiiiii",
        $player_id,
        $week_number,
        $match_id,
        $points,
        $rebounds,
        $assists,
        $steals,
        $blocks,
        $turnovers,
        $minutes,
        $fantasy_points
    );

    $ins->execute();
    $inserted++;
}

$ins->close();

// ---------- 3) WEEKLY SCORING (USER LEVEL) ----------
// Recompute user_points for this week from scratch,
// using SUM of weekly_stats rows per player/week.
function recalc_user_points_for_week(mysqli $conn, int $week_number) {
    $info = [
        "teamsFound"    => 0,
        "rowsInserted"  => 0,
    ];

    // Clear existing user_points for this week
    $del = $conn->prepare("DELETE FROM user_points WHERE week_number = ?");
    $del->bind_param("i", $week_number);
    $del->execute();
    $del->close();

    // Get teams for this week
    $tsql = "SELECT id, user_id FROM user_team WHERE week_number = ?";
    $tstmt = $conn->prepare($tsql);
    $tstmt->bind_param("i", $week_number);
    $tstmt->execute();
    $teams_res = $tstmt->get_result();

    if ($teams_res->num_rows === 0) {
        return $info;
    }

    while ($team = $teams_res->fetch_assoc()) {
        $team_id = (int)$team["id"];
        $user_id = (int)$team["user_id"];
        $info["teamsFound"]++;

        $total_fantasy = 0;

        // IMPORTANT: Sum weekly_stats per player/week first (supports multiple rows)
        $msql = "
            SELECT 
                utm.role,
                utm.player_id,
                utm.coach_id,
                utm.is_captain,
                c.bonus_points,
                COALESCE(ws_sum.total_fp, 0) AS ws_fp
            FROM user_team_members utm
            LEFT JOIN coaches c 
                ON utm.coach_id = c.id
            LEFT JOIN (
                SELECT player_id, week_number, SUM(fantasy_points) AS total_fp
                FROM weekly_stats
                WHERE week_number = ?
                GROUP BY player_id, week_number
            ) ws_sum
                ON ws_sum.player_id = utm.player_id
               AND ws_sum.week_number = ?
            WHERE utm.user_team_id = ?
        ";

        $mstmt = $conn->prepare($msql);
        $mstmt->bind_param("iii", $week_number, $week_number, $team_id);
        $mstmt->execute();
        $mres = $mstmt->get_result();

        while ($row = $mres->fetch_assoc()) {
            $role = $row["role"];

            if ($role === "PLAYER" && !empty($row["player_id"])) {
                $fp = (int)$row["ws_fp"];

                if ((int)$row["is_captain"] === 1) {
                    $fp *= 2;
                }

                $total_fantasy += $fp;
            }

            if ($role === "COACH" && !empty($row["coach_id"])) {
                $bonus = isset($row["bonus_points"]) ? (int)$row["bonus_points"] : 0;
                $total_fantasy += $bonus;
            }
        }
        $mstmt->close();

        // Insert into user_points
        $ins = $conn->prepare("
            INSERT INTO user_points (user_id, week_number, fantasy_points)
            VALUES (?, ?, ?)
        ");
        $ins->bind_param("iii", $user_id, $week_number, $total_fantasy);
        $ins->execute();
        $ins->close();

        $info["rowsInserted"]++;
    }

    return $info;
}

$scoringInfo = recalc_user_points_for_week($conn, $week_number);

// ---------- 4) FINAL RESPONSE ----------
echo json_encode([
    "success"     => true,
    "message"     => "Stats inserted (no overwrite) and weekly scores updated",
    "inserted"    => $inserted,
    "updated"     => 0,
    "week_number" => $week_number,
    "scoring"     => $scoringInfo
]);
