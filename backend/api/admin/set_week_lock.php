<?php
require_once "../../config/db.php";
session_start();
header("Content-Type: application/json");

if (empty($_SESSION["is_admin"])) {
  echo json_encode(["success" => false, "message" => "Admin access only"]);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$week_number = (int)($data["week_number"] ?? 0);
$is_locked   = (int)($data["is_locked"] ?? 0);

if ($week_number <= 0) {
  echo json_encode(["success" => false, "message" => "week_number is required"]);
  exit;
}

$sql = "
  INSERT INTO week_settings (week_number, is_locked, locked_at)
  VALUES (?, ?, IF(?=1, NOW(), NULL))
  ON DUPLICATE KEY UPDATE
    is_locked = VALUES(is_locked),
    locked_at = VALUES(locked_at)
";
$st = $conn->prepare($sql);
$st->bind_param("iii", $week_number, $is_locked, $is_locked);
$st->execute();

echo json_encode([
  "success" => true,
  "week_number" => $week_number,
  "is_locked" => $is_locked
]);
