<?php
require_once "../../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

$user_id     = $data["user_id"] ?? null;
$week_number = $data["week_number"] ?? null;

if (!$user_id || !$week_number) {
    echo json_encode(["success" => false, "message" => "user_id and week_number are required."]);
    exit;
}

// -------------------------------------------------------
// 1) GET THE TEAM FOR THIS USER + WEEK
// -------------------------------------------------------
$team_sql = "
    SELECT id 
    FROM user_team 
    WHERE user_id = ? AND week_number = ?
";
$stmt = $conn->prepare($team_sql);
$stmt->bind_param("ii", $user_id, $week_number);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "No team found for this week."]);
    exit;
}

$team = $res->fetch_assoc();
$user_team_id = $team["id"];

// -------------------------------------------------------
// 2) CALCULATE VALUE TO REFUND (CURRENT PRICES)
// -------------------------------------------------------
// -------------------------------------------------------
// 3) CALCULATE COST TO REFUND (CURRENT TEAM WORTH)
//     must match the logic in get_team.php
// -------------------------------------------------------
$cost_sql = "
    SELECT
        COALESCE(SUM(CASE WHEN utm.role = 'PLAYER' THEN p.price END), 0) AS players_cost,
        COALESCE(SUM(CASE WHEN utm.role = 'COACH'  THEN c.price END), 0) AS coach_cost
    FROM user_team_members utm
    LEFT JOIN players p ON utm.player_id = p.id
    LEFT JOIN coaches c ON utm.coach_id = c.id
    WHERE utm.user_team_id = ?
";

$stmt = $conn->prepare($cost_sql);
$stmt->bind_param("i", $user_team_id);
$stmt->execute();
$cost_res = $stmt->get_result()->fetch_assoc();

$refund = (int)$cost_res["players_cost"] + (int)$cost_res["coach_cost"];


// -------------------------------------------------------
// 3) DELETE MEMBERS
// -------------------------------------------------------
$delete_members = $conn->prepare("DELETE FROM user_team_members WHERE user_team_id = ?");
$delete_members->bind_param("i", $user_team_id);
$delete_members->execute();

// -------------------------------------------------------
// 4) DELETE TEAM
// -------------------------------------------------------
$delete_team = $conn->prepare("DELETE FROM user_team WHERE id = ?");
$delete_team->bind_param("i", $user_team_id);
$delete_team->execute();

// -------------------------------------------------------
// 5) REFUND USER BUDGET (SELL TEAM)
// -------------------------------------------------------
$update_budget = $conn->prepare("
    UPDATE users 
    SET budget_remaining = budget_remaining + ? 
    WHERE id = ?
");
$update_budget->bind_param("ii", $refund, $user_id);
$update_budget->execute();

// -------------------------------------------------------
// 6) GET NEW BUDGET
// -------------------------------------------------------
$get_budget = $conn->prepare("SELECT budget_remaining FROM users WHERE id = ?");
$get_budget->bind_param("i", $user_id);
$get_budget->execute();
$new_budget = $get_budget->get_result()->fetch_assoc()["budget_remaining"];

// -------------------------------------------------------
// 7) RESPONSE
// -------------------------------------------------------
echo json_encode([
    "success" => true,
    "message" => "Team sold successfully. Value refunded to your budget.",
    "refund"  => $refund,
    "budget_remaining" => $new_budget
]);
?>
