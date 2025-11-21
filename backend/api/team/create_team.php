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

// Get total cost of the team (sum of players' prices and coach's price)
$total_cost = 0;
foreach ($players as $player_id) {
    // Fetch player price
    $player_query = $conn->prepare("SELECT price FROM players WHERE id = ?");
    $player_query->bind_param("i", $player_id);
    $player_query->execute();
    $result = $player_query->get_result();
    $player = $result->fetch_assoc();
    $total_cost += $player['price'];  // Add player price to total cost
}

// Fetch coach price
$coach_query = $conn->prepare("SELECT price FROM coaches WHERE id = ?");
$coach_query->bind_param("i", $coach_id);
$coach_query->execute();
$coach_result = $coach_query->get_result();
$coach = $coach_result->fetch_assoc();
$total_cost += $coach['price'];  // Add coach price to total cost

// Calculate remaining budget
$budget_remaining = 100 - $total_cost;

// SQL query to insert into user_team table
$sql = "INSERT INTO user_team (user_id, week_number, team_name, coach_id, captain_id) 
        VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

// Bind the parameters
$stmt->bind_param("iissi", $user_id, $week_number, $team_name, $coach_id, $captain_id);

// Execute the query
if ($stmt->execute()) {
    $team_id = $stmt->insert_id;

    // Insert players and set captain flag
    foreach ($players as $player_id) {
        // If this player is the captain, set is_captain to 1
        $role = 'PLAYER';
        $is_captain = ($player_id == $captain_id) ? 1 : 0; // Set captain flag for the captain

        // Insert player and set captain flag
        $insert_player = $conn->prepare("INSERT INTO user_team_members (user_team_id, player_id, coach_id, role, is_captain) 
                                        VALUES (?, ?, ?, ?, ?)");
        $insert_player->bind_param("iiisi", $team_id, $player_id, $coach_id, $role, $is_captain);
        $insert_player->execute();
    }

    // Insert the coach as a member (always 'COACH' and is_captain = 0)
    $insert_coach = $conn->prepare("INSERT INTO user_team_members (user_team_id, coach_id, role, is_captain) 
                                    VALUES (?, ?, 'COACH', 0)");
    $insert_coach->bind_param("ii", $team_id, $coach_id);
    $insert_coach->execute();

    
    // Now update the user's budget in the users table
    $update_budget = $conn->prepare("UPDATE users SET budget_remaining = ? WHERE id = ?");
    $update_budget->bind_param("ii", $budget_remaining, $user_id);
    $update_budget->execute();

    // Return success message along with the remaining budget
    echo json_encode([
        "success" => true,
        "message" => "Team created successfully",
        "team_id" => $team_id,
        "budget_remaining" => $budget_remaining
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error creating team: " . $conn->error]);
}
?>
