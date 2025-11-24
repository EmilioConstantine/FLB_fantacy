<?php
// backend/api/admin/admin_add_stats.php

require_once "../../config/db.php";
require_once "require_admin.php";


// We already send Content-Type & CORS from db.php, but it's ok to ensure JSON:
header("Content-Type: application/json");

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
$stats       = isset($data['stats']) && is_array($data['stats']) ? $data['stats'] : [];

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

// ---------- 2) SAVE / UPDATE WEEKLY_STATS ----------

$inserted = 0;
$updated  = 0;

foreach ($stats as $s) {
    $player_id = isset($s['player_id']) ? (int)$s['player_id'] : 0;
    if ($player_id <= 0) {
        continue; // skip invalid
    }

    $points    = isset($s['points'])    ? (int)$s['points']    : 0;
    $rebounds  = isset($s['rebounds'])  ? (int)$s['rebounds']  : 0;
    $assists   = isset($s['assists'])   ? (int)$s['assists']   : 0;
    $steals    = isset($s['steals'])    ? (int)$s['steals']    : 0;
    $blocks    = isset($s['blocks'])    ? (int)$s['blocks']    : 0;
    $turnovers = isset($s['turnovers']) ? (int)$s['turnovers'] : 0;
    $minutes   = isset($s['minutes'])   ? (int)$s['minutes']   : 0;
    $match_id  = isset($s['match_id'])  ? (int)$s['match_id']  : null; // optional

    $fantasy_points = calculate_fantasy_points($s);

    // 2.1) check if row exists for this player & week
    $checkSql = "SELECT id FROM weekly_stats WHERE player_id = ? AND week_number = ?";
    $check = $conn->prepare($checkSql);
    if (!$check) {
        echo json_encode([
            "success" => false,
            "message" => "Prepare failed (check): " . $conn->error
        ]);
        exit;
    }
    $check->bind_param("ii", $player_id, $week_number);
    $check->execute();
    $res      = $check->get_result();
    $existing = $res->fetch_assoc();
    $check->close();

    if ($existing) {
        // 2.2) UPDATE existing row
        $id = (int)$existing['id'];

        $updateSql = "
            UPDATE weekly_stats
            SET match_id = ?, points = ?, rebounds = ?, assists = ?, steals = ?,
                blocks = ?, turnovers = ?, minutes = ?, fantasy_points = ?
            WHERE id = ?
        ";
        $upd = $conn->prepare($updateSql);
        if (!$upd) {
            echo json_encode([
                "success" => false,
                "message" => "Prepare failed (update): " . $conn->error
            ]);
            exit;
        }

        // 9 fields to set + 1 id  -> 10 ints  -> 'iiiiiiiiii'
        $upd->bind_param(
            "iiiiiiiiii",
            $match_id,
            $points,
            $rebounds,
            $assists,
            $steals,
            $blocks,
            $turnovers,
            $minutes,
            $fantasy_points,
            $id
        );

        $upd->execute();
        $upd->close();
        $updated++;
    } else {
        // 2.3) INSERT new row
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

        // 11 values -> 11 ints -> 'iiiiiiiiiii'
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
        $ins->close();
        $inserted++;
    }
}

// ---------- 3) WEEKLY SCORING (USER LEVEL) ----------
// This uses weekly_stats + user_team + user_team_members + coaches
// and writes totals into user_points.

function recalc_user_points_for_week(mysqli $conn, int $week_number) {
    $info = [
        "teamsFound"    => 0,
        "rowsInserted"  => 0,
    ];

    // 3.1) Clear existing user_points for this week (recompute from scratch)
    $del = $conn->prepare("DELETE FROM user_points WHERE week_number = ?");
    $del->bind_param("i", $week_number);
    $del->execute();
    $del->close();

    // 3.2) get teams for this week
    $tsql = "SELECT id, user_id FROM user_team WHERE week_number = ?";
    $tstmt = $conn->prepare($tsql);
    $tstmt->bind_param("i", $week_number);
    $tstmt->execute();
    $teams_res = $tstmt->get_result();

    if ($teams_res->num_rows === 0) {
        return $info; // no teams for this week
    }

    while ($team = $teams_res->fetch_assoc()) {
        $team_id = (int)$team["id"];
        $user_id = (int)$team["user_id"];
        $info["teamsFound"]++;

        $total_fantasy = 0;

        // 3.3) join members + weekly stats + coach bonus
        $msql = "
            SELECT 
                utm.role,
                utm.player_id,
                utm.coach_id,
                utm.is_captain,
                c.bonus_points,
                ws.fantasy_points AS ws_fp
            FROM user_team_members utm
            LEFT JOIN coaches c 
                ON utm.coach_id = c.id
            LEFT JOIN weekly_stats ws 
                ON ws.player_id = utm.player_id
               AND ws.week_number = ?
            WHERE utm.user_team_id = ?
        ";

        $mstmt = $conn->prepare($msql);
        $mstmt->bind_param("ii", $week_number, $team_id);
        $mstmt->execute();
        $mres = $mstmt->get_result();

        while ($row = $mres->fetch_assoc()) {
            $role = $row["role"];

            if ($role === "PLAYER" && $row["player_id"]) {
                // use the fantasy_points previously computed in weekly_stats
                $fp = isset($row["ws_fp"]) ? (int)$row["ws_fp"] : 0;

                if ((int)$row["is_captain"] === 1) {
                    $fp *= 2; // captain double
                }

                $total_fantasy += $fp;
            }

            if ($role === "COACH" && $row["coach_id"]) {
                $bonus = isset($row["bonus_points"]) ? (int)$row["bonus_points"] : 0;
                $total_fantasy += $bonus;
            }
        }
        $mstmt->close();

        // 3.4) insert into user_points
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

// run the weekly scoring for this week
$scoringInfo = recalc_user_points_for_week($conn, $week_number);

// ---------- 4) FINAL RESPONSE ----------

echo json_encode([
    "success"     => true,
    "message"     => "Stats processed and weekly scores updated",
    "inserted"    => $inserted,
    "updated"     => $updated,
    "week_number" => $week_number,
    "scoring"     => $scoringInfo
]);
