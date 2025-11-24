<?php
require_once "../../config/db.php";
session_start();
if (empty($_SESSION["is_admin"])) {
    echo json_encode([
        "success" => false,
        "message" => "Admin access only"
    ]);
    exit;
}


$data = json_decode(file_get_contents("php://input"), true);

$mode = $data["mode"] ?? null;

if (!$mode) {
    echo json_encode(["success" => false, "message" => "mode is required (single/batch)."]);
    exit;
}

// ========================================
// MODE 1: Single player price update
// ========================================
if ($mode === "single") {

    $player_id = $data["player_id"] ?? null;
    $new_price = $data["new_price"] ?? null;

    if (!$player_id || !$new_price) {
        echo json_encode(["success" => false, "message" => "player_id and new_price required"]);
        exit;
    }

    // Check if player exists
    $check = $conn->prepare("SELECT id FROM players WHERE id = ?");
    $check->bind_param("i", $player_id);
    $check->execute();
    if ($check->get_result()->num_rows == 0) {
        echo json_encode(["success" => false, "message" => "Player not found."]);
        exit;
    }

    // Update price
    $update = $conn->prepare("UPDATE players SET price = ? WHERE id = ?");
    $update->bind_param("ii", $new_price, $player_id);
    $update->execute();

    echo json_encode([
        "success" => true,
        "message" => "Player price updated successfully."
    ]);
    exit;
}

// ========================================
// MODE 2: Batch player price update
// ========================================
if ($mode === "batch") {

    $updates = $data["updates"] ?? null;

    if (!$updates || !is_array($updates)) {
        echo json_encode(["success" => false, "message" => "updates array required"]);
        exit;
    }

    foreach ($updates as $u) {

        if (!isset($u["player_id"]) || !isset($u["new_price"])) {
            echo json_encode(["success" => false, "message" => "player_id and new_price required in updates"]);
            exit;
        }

        $player_id = $u["player_id"];
        $new_price = $u["new_price"];

        // Check if player exists
        $check = $conn->prepare("SELECT id FROM players WHERE id = ?");
        $check->bind_param("i", $player_id);
        $check->execute();
        if ($check->get_result()->num_rows == 0) {
            echo json_encode(["success" => false, "message" => "Player ID $player_id not found."]);
            exit;
        }

        // Update price
        $update = $conn->prepare("UPDATE players SET price = ? WHERE id = ?");
        $update->bind_param("ii", $new_price, $player_id);
        $update->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Batch price update completed successfully."
    ]);
    exit;
}

// Invalid mode
echo json_encode(["success" => false, "message" => "Invalid mode. Use 'single' or 'batch'."]);
?>
