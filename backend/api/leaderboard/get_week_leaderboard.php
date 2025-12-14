<?php
require_once "../../config/db.php";
header("Content-Type: application/json");

$week = (int)($_GET["week_number"] ?? 0);
if ($week <= 0) {
  echo json_encode(["success" => false, "message" => "week_number is required"]);
  exit;
}

/*
  Weekly leaderboard = points earned IN THAT WEEK only.
  Uses user_points table (already has week_number + fantasy_points).
*/
$sql = "
  SELECT
    u.id AS user_id,
    u.username,
    u.email,
    SUM(up.fantasy_points) AS week_points
  FROM user_points up
  JOIN users u ON u.id = up.user_id
  WHERE up.week_number = ?
  GROUP BY u.id, u.username, u.email
  ORDER BY week_points DESC
";

$st = $conn->prepare($sql);
$st->bind_param("i", $week);
$st->execute();
$res = $st->get_result();

$leaderboard = [];
while ($row = $res->fetch_assoc()) {
  $leaderboard[] = [
    "user_id" => (int)$row["user_id"],
    "username" => $row["username"],
    "email" => $row["email"],
    "week_number" => $week,
    "week_points" => (int)$row["week_points"]
  ];
}

echo json_encode([
  "success" => true,
  "week_number" => $week,
  "leaderboard" => $leaderboard
]);
