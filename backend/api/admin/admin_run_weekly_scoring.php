<?php
require_once "../../config/db.php";
require_once "require_admin.php";

header("Content-Type: application/json");

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);

$week_number = isset($data['week_number']) ? (int)$data['week_number'] : 0;
if ($week_number <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "week_number is required"
    ]);
    exit;
}

/*
  We assume your DB structure:

  - user_team (id, user_id, week_number, team_name, coach_id, captain_id, ...)
  - user_team_members (user_team_id, player_id, coach_id, role, is_captain)
  - weekly_stats (player_id, week_number, fantasy_points, ...)
  - coaches (id, bonus_points, ... )
  - user_points (user_id, week_number, fantasy_points)
*/

// 1) get all teams for that week
$sqlTeams = "
  SELECT id, user_id, coach_id
  FROM user_team
  WHERE week_number = ?
";
$stTeams = $conn->prepare($sqlTeams);
$stTeams->bind_param("i", $week_number);
$stTeams->execute();
$resTeams = $stTeams->get_result();

if ($resTeams->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "No teams found for week $week_number"
    ]);
    exit;
}

// prepare helpers -----------------------------------------

// quick helper to get coach bonus
$sqlCoach = "SELECT bonus_points FROM coaches WHERE id = ?";
$stCoach  = $conn->prepare($sqlCoach);

$sqlPlayers = "
  SELECT utm.player_id, ws.fantasy_points
  FROM user_team_members utm
  LEFT JOIN weekly_stats ws 
    ON ws.player_id = utm.player_id 
   AND ws.week_number = ?
  WHERE utm.user_team_id = ?
    AND utm.role = 'PLAYER'
";
$stPlayers = $conn->prepare($sqlPlayers);

$sqlUpsert = "
  INSERT INTO user_points (user_id, week_number, fantasy_points)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE fantasy_points = VALUES(fantasy_points)
";
$stUpsert = $conn->prepare($sqlUpsert);

$processed = 0;

while ($team = $resTeams->fetch_assoc()) {
    $team_id = (int)$team['id'];
    $user_id = (int)$team['user_id'];
    $coach_id = (int)$team['coach_id'];

    // 2) sum player fantasy points (already computed in weekly_stats)
    $stPlayers->bind_param("ii", $week_number, $team_id);
    $stPlayers->execute();
    $resPlayers = $stPlayers->get_result();

    $total_fp = 0;
    while ($row = $resPlayers->fetch_assoc()) {
        $total_fp += (int)($row['fantasy_points'] ?? 0);
    }

    // 3) add coach bonus
    $coach_bonus = 0;
    if ($coach_id) {
        $stCoach->bind_param("i", $coach_id);
        $stCoach->execute();
        $resCoach = $stCoach->get_result()->fetch_assoc();
        if ($resCoach) {
            $coach_bonus = (int)$resCoach['bonus_points'];
        }
    }
    $total_fp += $coach_bonus;

    // 4) upsert into user_points
    $stUpsert->bind_param("iii", $user_id, $week_number, $total_fp);
    $stUpsert->execute();

    $processed++;
}

echo json_encode([
    "success" => true,
    "message" => "Weekly scoring done.",
    "week_number" => $week_number,
    "processedUsers" => $processed
]);
