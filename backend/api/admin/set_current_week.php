<?php
require_once "../../config/db.php";
session_start();
header("Content-Type: application/json");

if (empty($_SESSION["is_admin"])) {
  echo json_encode(["success" => false, "message" => "Admin access only"]);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$current_week = (int)($data["current_week"] ?? 0);

if ($current_week <= 0) {
  echo json_encode(["success" => false, "message" => "current_week must be > 0"]);
  exit;
}

$sql = "
  INSERT INTO app_settings (id, current_week, updated_at)
  VALUES (1, ?, NOW())
  ON DUPLICATE KEY UPDATE current_week = VALUES(current_week), updated_at = VALUES(updated_at)
";
$st = $conn->prepare($sql);
$st->bind_param("i", $current_week);
$st->execute();

echo json_encode([
  "success" => true,
  "current_week" => $current_week
]);
