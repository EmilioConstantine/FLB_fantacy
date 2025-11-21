<?php
require_once "../../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

$user_id      = $data["user_id"] ?? null;
$week_number  = $data["week_number"] ?? null;
$team_name    = $data["team_name"] ?? "My Fantasy Team";

$players      = $data["players"] ?? []; // array of 5 player IDs
$coach_id     = $data["coach_id"] ?? null;
$captain_id   = $data["captain_id"] ?? null;

// --------------------------
// 1) VALIDATION
// --------------------------

if (!$user_id || !$week_number || !$coach_id || empty($players)) {
    echo json_encode(["success" => false, "message" => "Missing required fields."]);
    exit;
}

// Validate #players = 5
if (count($players) != 5) {
    echo json_encode(["success" => false, "message" => "Team must have exactly 5 players."]);
    exit;
}

// Validate unique players (no duplicates)
if (count($players) !== count(array_unique($players))) {
    echo json_encode(["success" => false, "message" => "Duplicate players detected."]);
    exit;
}

// Validate captain is one of the players
if (!in_array($captain_id, $players)) {
    echo json_encode(["success" => false, "message" => "Captain must be one of the selected players."]);
    exit;
}

// --------------------------
// 2) CHECK: user already created a team this week?
// --------------------------

$check_sql = "SELECT id FROM user_team WHERE user_id = ? AND week_number = ?";
$stmt = $conn->prepare($check_sql);
$stmt->bind_param("ii", $user_id, $week_number);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "You already created a team for this week."
    ]);
    exit;
}

// --------------------------
// 3) CALCULATE TEAM COST
// --------------------------

// Get players total price
$players_str = implode(",", array_map('intval', $players));

$player_sql = "SELECT SUM(price) AS total FROM players WHERE id IN ($players_str)";
$player_result = $conn->query($player_sql);
$players_cost = $player_result->fetch_assoc()["total"];

// Get coach price
$coach_sql = "SELECT price FROM coaches WHERE id = ?";
$stmt = $conn->prepare($coach_sql);
$stmt->bind_param("i", $coach_id);
$stmt->execute();
$coach_result = $stmt->get_result();
$coach_cost = $coach_result->fetch_assoc()["price"];

$total_cost = $players_cost + $coach_cost;

// --------------------------
// 4) Check user budget
// --------------------------

$user_sql = "SELECT budget_remaining FROM users WHERE id = ?";
$stmt = $conn->prepare($user_sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$budget_result = $stmt->get_result();
$user_budget = $budget_result->fetch_assoc()["budget_remaining"];

if ($total_cost > $user_budget) {
    echo json_encode([
        "success" => false,
        "message" => "Not enough budget. Required: $total_cost, Available: $user_budget"
    ]);
    exit;
}

// --------------------------
// 5) INSERT INTO user_team
// --------------------------

$insert_team_sql = "INSERT INTO user_team (user_id, week_number, team_name)
                    VALUES (?, ?, ?)";
$stmt = $conn->prepare($insert_team_sql);
$stmt->bind_param("iis", $user_id, $week_number, $team_name);
$stmt->execute();

$user_team_id = $stmt->insert_id;

// --------------------------
// 6) INSERT TEAM MEMBERS
// --------------------------

$member_sql = "INSERT INTO user_team_members
               (user_team_id, player_id, coach_id, role, is_captain)
               VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($member_sql);

// Insert players
foreach ($players as $p_id) {
    $is_captain = ($p_id == $captain_id) ? 1 : 0;
    $stmt->bind_param("iiisi", $user_team_id, $p_id, $null = null, $role = "PLAYER", $is_captain);
    $stmt->execute();
}

// Insert coach
$stmt->bind_param("iiisi", $user_team_id, $null = null, $coach_id, $role = "COACH", $is_captain = 0);
$stmt->execute();

// --------------------------
// 7) UPDATE USER BUDGET
// --------------------------

$new_budget = $user_budget - $total_cost;

$update_budget_sql = "UPDATE users SET budget_remaining = ? WHERE id = ?";
$stmt = $conn->prepare($update_budget_sql);
$stmt->bind_param("ii", $new_budget, $user_id);
$stmt->execute();

// --------------------------
// 8) SUCCESS RESPONSE
// --------------------------

echo json_encode([
    "success" => true,
    "message" => "Fantasy team created successfully!",
    "team_id" => $user_team_id,
    "total_cost" => $total_cost,
    "budget_remaining" => $new_budget
]);
?>
