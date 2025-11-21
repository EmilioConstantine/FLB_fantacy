<?php
require_once "../../config/db.php";

$player_id = $_GET["player_id"] ?? null;

if (!$player_id) {
    echo json_encode(["success" => false, "message" => "player_id is required."]);
    exit;
}

// ----------------------------------------------
// 1) GET PLAYER INFO
// ----------------------------------------------

$player_sql = "
    SELECT id, name, team, position, price
    FROM players
    WHERE id = ?
";

$stmt = $conn->prepare($player_sql);
$stmt->bind_param("i", $player_id);
$stmt->execute();
$player_res = $stmt->get_result();

if ($player_res->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Player not found."]);
    exit;
}

$player = $player_res->fetch_assoc();

// ----------------------------------------------
// 2) GET WEEKLY STATS + FANTASY POINTS
// ----------------------------------------------

$stats_sql = "
    SELECT 
        week_number,
        points,
        rebounds,
        assists,
        steals,
        blocks,
        turnovers,
        minutes,
        fantasy_points
    FROM weekly_stats
    WHERE player_id = ?
    ORDER BY week_number ASC
";

$stmt = $conn->prepare($stats_sql);
$stmt->bind_param("i", $player_id);
$stmt->execute();
$stats_res = $stmt->get_result();

$weekly_stats = [];

while ($row = $stats_res->fetch_assoc()) {
    $weekly_stats[] = [
        "week_number"    => (int)$row["week_number"],
        "points"         => (int)$row["points"],
        "rebounds"       => (int)$row["rebounds"],
        "assists"        => (int)$row["assists"],
        "steals"         => (int)$row["steals"],
        "blocks"         => (int)$row["blocks"],
        "turnovers"      => (int)$row["turnovers"],
        "minutes"        => (int)$row["minutes"],
        "fantasy_points" => (int)$row["fantasy_points"]
    ];
}

// ----------------------------------------------
// 3) RESPONSE
// ----------------------------------------------

echo json_encode([
    "success" => true,
    "player" => $player,
    "weekly_stats" => $weekly_stats
]);
?>
