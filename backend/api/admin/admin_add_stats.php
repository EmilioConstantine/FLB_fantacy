<?php
// backend/api/admin/admin_add_stats.php

require_once "../../config/db.php";

// We already send Content-Type & CORS from db.php, but it's ok to ensure JSON:
header("Content-Type: application/json");

// Handle CORS preflight (if browser sends OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Read JSON from body
$raw = file_get_contents("php://input");
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

// Same fantasy scoring formula as in JS (adjust if you change it)
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

    // 1) Check if row exists for this player & week
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
    $res = $check->get_result();
    $existing = $res->fetch_assoc();
    $check->close();

    if ($existing) {
        // 2) UPDATE existing row
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
        // 3) INSERT new row
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

// 4) Final JSON response
echo json_encode([
    "success"     => true,
    "message"     => "Stats processed",
    "inserted"    => $inserted,
    "updated"     => $updated,
    "week_number" => $week_number
]);
