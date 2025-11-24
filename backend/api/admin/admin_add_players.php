<?php
require_once "../../config/db.php";
require_once "require_admin.php";


$data = json_decode(file_get_contents("php://input"), true);

$type = $data["type"] ?? null; // "player" or "coach"

if (!$type) {
    echo json_encode(["success" => false, "message" => "type (player/coach) is required"]);
    exit;
}

// =====================================
// ADD PLAYER
// =====================================
if ($type === "player") {

    $name     = $data["name"] ?? null;
    $team     = $data["team"] ?? null;
    $position = $data["position"] ?? null; // PG, SG, SF, PF, C
    $price    = $data["price"] ?? null;

    if (!$name || !$team || !$position || !$price) {
        echo json_encode(["success" => false, "message" => "Missing fields for player."]);
        exit;
    }

    // Check duplicate
    $check = $conn->prepare("SELECT id FROM players WHERE name = ? AND team = ?");
    $check->bind_param("ss", $name, $team);
    $check->execute();
    $exists = $check->get_result()->num_rows;

    if ($exists > 0) {
        echo json_encode(["success" => false, "message" => "Player already exists."]);
        exit;
    }

    // Insert
    $sql = $conn->prepare("
        INSERT INTO players (name, team, position, price)
        VALUES (?, ?, ?, ?)
    ");
    $sql->bind_param("sssi", $name, $team, $position, $price);
    $sql->execute();

    echo json_encode(["success" => true, "message" => "Player added successfully"]);
    exit;
}

// =====================================
// ADD COACH
// =====================================
if ($type === "coach") {

    $name   = $data["name"] ?? null;
    $team   = $data["team"] ?? null;
    $price  = $data["price"] ?? null;
    $bonus  = $data["bonus_points"] ?? 5; // default

    if (!$name || !$team || !$price) {
        echo json_encode(["success" => false, "message" => "Missing fields for coach."]);
        exit;
    }

    // Check duplicate
    $check = $conn->prepare("SELECT id FROM coaches WHERE name = ? AND team = ?");
    $check->bind_param("ss", $name, $team);
    $check->execute();
    $exists = $check->get_result()->num_rows;

    if ($exists > 0) {
        echo json_encode(["success" => false, "message" => "Coach already exists."]);
        exit;
    }

    // Insert
    $sql = $conn->prepare("
        INSERT INTO coaches (name, team, price, bonus_points)
        VALUES (?, ?, ?, ?)
    ");
    $sql->bind_param("ssii", $name, $team, $price, $bonus);
    $sql->execute();

    echo json_encode(["success" => true, "message" => "Coach added successfully"]);
    exit;
}

echo json_encode(["success" => false, "message" => "Invalid type (must be player or coach)."]);
?>
