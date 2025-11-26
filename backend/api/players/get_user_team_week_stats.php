<?php
// backend/api/players/get_user_team_week_stats.php
require_once "../../config/db.php";

header("Content-Type: application/json");

// Read params
$user_id     = $_GET["user_id"]     ?? null;
$week_number = $_GET["week_number"] ?? null;

if (!$user_id || !$week_number) {
    echo json_encode([
        "success" => false,
        "message" => "user_id and week_number are required."
    ]);
    exit;
}

// 1) Find the team for this user & week
$sql_team = "
    SELECT id, team_name
    FROM user_team
    WHERE user_id = ? AND week_number = ?
    LIMIT 1
";
$stmt_team = $conn->prepare($sql_team);
$stmt_team->bind_param("ii", $user_id, $week_number);
$stmt_team->execute();
$res_team = $stmt_team->get_result();

if ($res_team->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "No team found for this user and week."
    ]);
    exit;
}

$team = $res_team->fetch_assoc();
$user_team_id = (int)$team["id"];

// 2) Get all PLAYERS in that team + their weekly_stats for this week
$sql_players = "
    SELECT
        utm.player_id,
        p.name,
        p.team,
        p.position,
        utm.is_captain,
        ws.week_number,
        ws.points,
        ws.rebounds,
        ws.assists,
        ws.steals,
        ws.blocks,
        ws.turnovers,
        ws.minutes,
        ws.fantasy_points
    FROM user_team_members utm
    JOIN players p 
        ON utm.player_id = p.id
    LEFT JOIN weekly_stats ws 
        ON ws.player_id  = utm.player_id
       AND ws.week_number = ?
    WHERE utm.user_team_id = ?
      AND utm.role = 'PLAYER'
    ORDER BY p.position, p.name
";

$stmt_players = $conn->prepare($sql_players);
$stmt_players->bind_param("ii", $week_number, $user_team_id);
$stmt_players->execute();
$res_players = $stmt_players->get_result();

$players = [];
while ($row = $res_players->fetch_assoc()) {
    $players[] = [
        "player_id"      => (int)$row["player_id"],
        "name"           => $row["name"],
        "team"           => $row["team"],
        "position"       => $row["position"],
        "is_captain"     => (int)$row["is_captain"],
        "week_number"    => $row["week_number"] !== null ? (int)$row["week_number"] : null,
        "points"         => (int)($row["points"] ?? 0),
        "rebounds"       => (int)($row["rebounds"] ?? 0),
        "assists"        => (int)($row["assists"] ?? 0),
        "steals"         => (int)($row["steals"] ?? 0),
        "blocks"         => (int)($row["blocks"] ?? 0),
        "turnovers"      => (int)($row["turnovers"] ?? 0),
        "minutes"        => (int)($row["minutes"] ?? 0),
        "fantasy_points" => (int)($row["fantasy_points"] ?? 0),
    ];
}

echo json_encode([
    "success"      => true,
    "user_id"      => (int)$user_id,
    "week_number"  => (int)$week_number,
    "team"         => [
        "id"   => $user_team_id,
        "name" => $team["team_name"]
    ],
    "players"      => $players
]);
