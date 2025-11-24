<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');
require_once "../../config/db.php";

// Get user_id and week_number from query params
$user_id = $_GET['user_id'] ?? null;
$week_number = $_GET['week_number'] ?? null;

if (!$user_id || !$week_number) {
    echo json_encode(["success" => false, "message" => "user_id and week_number are required"]);
    exit;
}

// Query to fetch the team details for the given week number and user_id
$team_query = $conn->prepare("SELECT * FROM user_team WHERE user_id = ? AND week_number = ?");
$team_query->bind_param("ii", $user_id, $week_number);
$team_query->execute();
$team_result = $team_query->get_result();

if ($team_result->num_rows > 0) {
    $team = $team_result->fetch_assoc();
    $team_id = $team['id'];

    // Fetch team players
    $players_query = $conn->prepare("SELECT p.id, p.name, p.team, p.position, p.price, utm.is_captain 
                                     FROM user_team_members utm 
                                     JOIN players p ON utm.player_id = p.id 
                                     WHERE utm.user_team_id = ? AND utm.role = 'PLAYER'");
    $players_query->bind_param("i", $team_id);
    $players_query->execute();
    $players_result = $players_query->get_result();

    $players = [];
    $total_cost = 0; // Initialize total cost to 0
    while ($player = $players_result->fetch_assoc()) {
        $players[] = $player;
        $total_cost += $player['price']; // Add player price to total cost
    }

    // Fetch coach details
    $coach_query = $conn->prepare("SELECT c.id, c.name, c.team, c.price FROM user_team_members utm 
                                  JOIN coaches c ON utm.coach_id = c.id 
                                  WHERE utm.user_team_id = ? AND utm.role = 'COACH'");
    $coach_query->bind_param("i", $team_id);
    $coach_query->execute();
    $coach_result = $coach_query->get_result();
    $coach = $coach_result->fetch_assoc();

    // Add coach price to total cost
    $total_cost += $coach['price'];

   // Fetch the updated budget_remaining from the users table
$user_budget_query = $conn->prepare("SELECT budget_remaining FROM users WHERE id = ?");
$user_budget_query->bind_param("i", $user_id);
$user_budget_query->execute();
$user_budget_result = $user_budget_query->get_result();
$user_budget = $user_budget_result->fetch_assoc();


    // Prepare the response with the updated budget and total cost
    echo json_encode([
        "success" => true,
        "team" => [
            "team_id" => $team_id,
            "user_id" => $user_id,
            "week_number" => $week_number,
            "team_name" => $team['team_name'],
            "players" => $players,
            "coach" => $coach,
            "total_cost" => $total_cost, // Return the total cost
            "budget_remaining" => $user_budget['budget_remaining'] // Return the updated budget
        ]
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Team not found"]);
}
?>
