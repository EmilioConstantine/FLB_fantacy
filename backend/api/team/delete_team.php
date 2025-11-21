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
// 1) CHECK IF POINTS FOR THIS WEEK WERE ALREADY CALCULATED
// -------------------------------------------------------
$check_points = $conn->prepare("
    SELECT id FROM user_points 
    WHERE user_id = ? AND week_number = ?
");
$check_points->bind_param("ii", $user_id, $week_number);
$check_points->execute();
$points_exist = $check_points->get_result()->num_rows;

if ($points_exist > 0) {
    echo json_encode([
        "success" => false,
        "message" => "You cannot delete your team because points were already calculated for this week."
    ]);
    exit;
}

// -------------------------------------------------------
// 2) GET THE TEAM
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
// 3) CALCULATE COST TO REFUND
// -------------------------------------------------------
$members_sql = "
    SELECT 
        p.price AS player_price,
        c.price AS coach_price
    FROM user_team_members utm
    LEFT JOIN players p ON utm.player_id = p.id
    LEFT JOIN coaches c ON utm.coach_id = c.id
    WHERE utm.user_team_id = ?
";

$stmt = $conn->prepare($members_sql);
$stmt->bind_param("i", $user_team_id);
$stmt->execute();
$members_res = $stmt->get_result();

$refund = 0;

while ($m = $members_res->fetch_assoc()) {
    if ($m["player_price"]) $refund += (int)$m["player_price"];
    if ($m["coach_price"]) $refund += (int)$m["coach_price"];
}

// -------------------------------------------------------
// 4) DELETE MEMBERS
// -------------------------------------------------------
$delete_members = $conn->prepare("DELETE FROM user_team_members WHERE user_team_id = ?");
$delete_members->bind_param("i", $user_team_id);
$delete_members->execute();

// -------------------------------------------------------
// 5) DELETE TEAM
// -------------------------------------------------------
$delete_team = $conn->prepare("DELETE FROM user_team WHERE id = ?");
$delete_team->bind_param("i", $user_team_id);
$delete_team->execute();

// -------------------------------------------------------
// 6) REFUND USER BUDGET
// -------------------------------------------------------
$update_budget = $conn->prepare("
    UPDATE users 
    SET budget_remaining = budget_remaining + ? 
    WHERE id = ?
");
$update_budget->bind_param("ii", $refund, $user_id);
$update_budget->execute();

// -------------------------------------------------------
// 7) GET NEW BUDGET
// -------------------------------------------------------
$get_budget = $conn->prepare("SELECT budget_remaining FROM users WHERE id = ?");
$get_budget->bind_param("i", $user_id);
$get_budget->execute();
$new_budget = $get_budget->get_result()->fetch_assoc()["budget_remaining"];

// -------------------------------------------------------
// 8) SEND RESPONSE
// -------------------------------------------------------
echo json_encode([
    "success" => true,
    "message" => "Team deleted successfully. Budget refunded.",
    "refund"  => $refund,
    "budget_remaining" => $new_budget
]);
?>
