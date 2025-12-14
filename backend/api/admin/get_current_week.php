<?php
require_once "../../config/db.php";
session_start();
header("Content-Type: application/json");

if (empty($_SESSION["is_admin"])) {
  echo json_encode(["success" => false, "message" => "Admin access only"]);
  exit;
}

$row = $conn->query("SELECT current_week, updated_at FROM app_settings WHERE id = 1")->fetch_assoc();

echo json_encode([
  "success" => true,
  "current_week" => $row ? (int)$row["current_week"] : 1,
  "updated_at" => $row["updated_at"] ?? null
]);
