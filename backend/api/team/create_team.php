<?php
require_once "../../config/db.php";

// Get data from the body
$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data['user_id'] ?? null;
$week_number = $data['week_number'] ?? null;
$team_name = $data['team_name'] ?? null;
$players = $data['players'] ?? null;
$coach_id = $data['coach_id'] ?? null;
$captain_id = $data['captain_id'] ?? null;

// Validate inputs
if (!$user_id || !$week_number || !$team_name || !$players || !$coach_id || !$captain_id) {
    echo json_encode(["success" => false, "message" => "All fields are required"]);
    exit;
}

// SQL query to insert into user_team table
$sql = "INSERT INTO user_team (user_id, week_number, team_name, coach_id, captain_id) 
        VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

// Bind the parameters
$stmt->bind_param("iissi", $user_id, $week_number, $team_name, $coach_id, $captain_id);

// Execute the query
if ($stmt->execute()) {
    $team_id = $stmt->insert_id;

    // Insert players into user_team_members table
    foreach ($players as $player_id) {
        $insert_player = $conn->prepare("INSERT INTO user_team_members (user_team_id, player_id) VALUES (?, ?)");
        $insert_player->bind_param("ii", $team_id, $player_id);
        $insert_player->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Team created successfully",
        "team_id" => $team_id
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error creating team: " . $conn->error]);
}
?>
