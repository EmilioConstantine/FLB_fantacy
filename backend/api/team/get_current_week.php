<?php
require_once "../../config/db.php";
header("Content-Type: application/json");

$row = $conn->query("SELECT current_week FROM app_settings WHERE id = 1")->fetch_assoc();

echo json_encode([
  "success" => true,
  "current_week" => $row ? (int)$row["current_week"] : 1
]);
