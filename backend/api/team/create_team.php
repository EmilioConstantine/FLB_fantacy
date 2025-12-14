<?php
require_once "../../config/db.php";
header("Content-Type: application/json");

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);

$user_id     = isset($data['user_id']) ? (int)$data['user_id'] : 0;
$week_number = isset($data['week_number']) ? (int)$data['week_number'] : 0;
$team_name   = isset($data['team_name']) ? trim($data['team_name']) : '';
$players     = isset($data['players']) && is_array($data['players']) ? $data['players'] : [];
$coach_id    = isset($data['coach_id']) ? (int)$data['coach_id'] : 0;
$captain_id  = isset($data['captain_id']) ? (int)$data['captain_id'] : 0;
require_once "../admin/week_lock_helpers.php";

if (is_week_locked($conn, (int)$week_number)) {
  echo json_encode([
    "success" => false,
    "message" => "Teams are locked for this week. You can’t buy/change a team right now."
  ]);
  exit;
}


// Basic validation
if ($user_id <= 0 || $week_number <= 0 || $team_name === '' || $coach_id <= 0 || $captain_id <= 0 || count($players) === 0) {
    echo json_encode(["success" => false, "message" => "All fields are required"]);
    exit;
}

// Normalize players to ints & remove duplicates
$players = array_values(array_unique(array_map('intval', $players)));

// Ensure captain is one of the selected players
if (!in_array($captain_id, $players, true)) {
    echo json_encode(["success" => false, "message" => "Captain must be one of the selected players"]);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();

    // Get user's current budget (recommended)
    // If you want a fixed weekly budget, set $available_budget = 100; and remove this query.
    $available_budget = 100.0;
    $budget_stmt = $conn->prepare("SELECT budget_remaining FROM users WHERE id = ?");
    $budget_stmt->bind_param("i", $user_id);
    $budget_stmt->execute();
    $budget_res = $budget_stmt->get_result();
    if ($budget_res->num_rows === 0) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "User not found"]);
        exit;
    }
    $available_budget = (float)$budget_res->fetch_assoc()['budget_remaining'];

    // Calculate total team cost using ONE query for players instead of looping
    $placeholders = implode(',', array_fill(0, count($players), '?'));
    $types = str_repeat('i', count($players));
    $sql_players = "SELECT COALESCE(SUM(price),0) AS total_players_cost, COUNT(*) AS cnt
                   FROM players
                   WHERE id IN ($placeholders)";
    $stmt_players = $conn->prepare($sql_players);
    $stmt_players->bind_param($types, ...$players);
    $stmt_players->execute();
    $players_data = $stmt_players->get_result()->fetch_assoc();

    // Ensure all player IDs exist
    if ((int)$players_data['cnt'] !== count($players)) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "One or more selected players are invalid"]);
        exit;
    }

    $players_cost = (float)$players_data['total_players_cost'];

    // Coach cost
    $coach_stmt = $conn->prepare("SELECT price FROM coaches WHERE id = ?");
    $coach_stmt->bind_param("i", $coach_id);
    $coach_stmt->execute();
    $coach_res = $coach_stmt->get_result();
    if ($coach_res->num_rows === 0) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "Invalid coach"]);
        exit;
    }
    $coach_cost = (float)$coach_res->fetch_assoc()['price'];

    $total_cost = $players_cost + $coach_cost;

    // 🚫 Block negative budget
    if ($total_cost > $available_budget) {
        $conn->rollback();
        echo json_encode([
            "success" => false,
            "message" => "Budget exceeded",
            "available_budget" => $available_budget,
            "total_cost" => $total_cost,
            "missing" => $total_cost - $available_budget
        ]);
        exit;
    }

    $budget_remaining = $available_budget - $total_cost;

    // Insert into user_team
    $sql = "INSERT INTO user_team (user_id, week_number, team_name, coach_id, captain_id)
            VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iisii", $user_id, $week_number, $team_name, $coach_id, $captain_id);

    if (!$stmt->execute()) {
        throw new Exception("Error creating team: " . $conn->error);
    }

    $team_id = $stmt->insert_id;

    // Insert players
    $insert_player = $conn->prepare("
        INSERT INTO user_team_members (user_team_id, player_id, coach_id, role, is_captain)
        VALUES (?, ?, ?, ?, ?)
    ");

    foreach ($players as $player_id) {
        $role = 'PLAYER';
        $is_captain = ($player_id === $captain_id) ? 1 : 0;
        $insert_player->bind_param("iiisi", $team_id, $player_id, $coach_id, $role, $is_captain);
        if (!$insert_player->execute()) {
            throw new Exception("Error inserting player member: " . $conn->error);
        }
    }

    // Insert coach member (role COACH)
    $insert_coach = $conn->prepare("
        INSERT INTO user_team_members (user_team_id, coach_id, role, is_captain)
        VALUES (?, ?, 'COACH', 0)
    ");
    $insert_coach->bind_param("ii", $team_id, $coach_id);
    if (!$insert_coach->execute()) {
        throw new Exception("Error inserting coach member: " . $conn->error);
    }

    // Update user budget
    // IMPORTANT: Use double (d) if your column is DECIMAL/DOUBLE
    $update_budget = $conn->prepare("UPDATE users SET budget_remaining = ? WHERE id = ?");
    $update_budget->bind_param("di", $budget_remaining, $user_id);
    if (!$update_budget->execute()) {
        throw new Exception("Error updating budget: " . $conn->error);
    }

    // Commit everything
    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Team created successfully",
        "team_id" => $team_id,
        "total_cost" => $total_cost,
        "budget_remaining" => $budget_remaining
    ]);
} catch (Exception $e) {
    if ($conn->errno) { /* ignore */ }
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
