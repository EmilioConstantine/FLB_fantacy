<?php
require_once "../../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

// Expecting:
// {
//    "week_number": 1,
//    "stats": [
//       { "player_id": 2, "points": 22, "rebounds": 4, "assists": 7, "steals": 2, "blocks": 1, "turnovers": 3 },
//       { "player_id": 5, "points": 15, "rebounds": 10, "assists": 2, ... }
//    ]
// }

$week_number = $data["week_number"] ?? null;
$stats       = $data["stats"] ?? null;

if (!$week_number || !$stats || !is_array($stats)) {
    echo json_encode(["success" => false, "message" => "week_number and stats array required"]);
    exit;
}

foreach ($stats as $s) {

    // Basic validation
    if (!isset($s["player_id"])) {
        echo json_encode(["success" => false, "message" => "player_id missing in one of the entries."]);
        exit;
    }

    $player_id = $s["player_id"];

    // Default values if missing
    $points     = $s["points"]     ?? 0;
    $rebounds   = $s["rebounds"]   ?? 0;
    $assists    = $s["assists"]    ?? 0;
    $steals     = $s["steals"]     ?? 0;
    $blocks     = $s["blocks"]     ?? 0;
    $turnovers  = $s["turnovers"]  ?? 0;
    $minutes    = $s["minutes"]    ?? 0;

    // ------------------------------------------------------------------
    // INSERT or UPDATE weekly_stats
    // ------------------------------------------------------------------

    $check = $conn->prepare("
        SELECT id FROM weekly_stats 
        WHERE player_id = ? AND week_number = ?
    ");
    $check->bind_param("ii", $player_id, $week_number);
    $check->execute();
    $exists = $check->get_result()->fetch_assoc();

    // ------------------------------------
    // If stats exist → UPDATE
    // ------------------------------------
    if ($exists) {
        $update = $conn->prepare("
            UPDATE weekly_stats
            SET points=?, rebounds=?, assists=?, steals=?, blocks=?, turnovers=?, minutes=?
            WHERE player_id=? AND week_number=?
        ");
        $update->bind_param(
            "iiiiiiiii",
            $points, $rebounds, $assists, $steals, $blocks, $turnovers, $minutes,
            $player_id, $week_number
        );
        $update->execute();
    }

    // ------------------------------------
    // If stats do NOT exist → INSERT
    // ------------------------------------
    else {
        $insert = $conn->prepare("
            INSERT INTO weekly_stats
            (player_id, week_number, points, rebounds, assists, steals, blocks, turnovers, minutes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insert->bind_param(
            "iiiiiiiii",
            $player_id, $week_number, $points, $rebounds, $assists,
            $steals, $blocks, $turnovers, $minutes
        );
        $insert->execute();
    }
}

// FINAL RESPONSE
echo json_encode([
    "success" => true,
    "message" => "Weekly stats saved successfully for week $week_number"
]);
?>
