<?php
require_once "../../config/db.php";
session_start();
header("Content-Type: application/json");

if (empty($_SESSION["is_admin"])) {
  echo json_encode(["success" => false, "message" => "Admin access only"]);
  exit;
}

$week_number = (int)($_GET["week_number"] ?? 0);
if ($week_number <= 0) {
  echo json_encode(["success" => false, "message" => "week_number is required"]);
  exit;
}

$sql = "SELECT is_locked, locked_at FROM week_settings WHERE week_number = ?";
$st = $conn->prepare($sql);
$st->bind_param("i", $week_number);
$st->execute();
$row = $st->get_result()->fetch_assoc();

echo json_encode([
  "success" => true,
  "week_number" => $week_number,
  "is_locked" => $row ? (int)$row["is_locked"] : 0,
  "locked_at" => $row["locked_at"] ?? null
]);
