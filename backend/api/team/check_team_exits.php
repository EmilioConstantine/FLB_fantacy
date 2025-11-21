<?php
require_once "../../config/db.php";

$user_id     = $_GET["user_id"] ?? null;
$week_number = $_GET["week_number"] ?? null;

if (!$user_id || !$week_number) {
    echo json_encode(["success" => false, "message" => "user_id and week_number are required."]);
    exit;
}

$sql = "
    SELECT id, team_name 
    FROM user_team 
    WHERE user_id = ? AND week_number = ?
    LIMIT 1
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $user_id, $week_number);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Team exists
    $team = $result->fetch_assoc();
    
    echo json_encode([
        "success" => true,
        "exists" => true,
        "team_id" => $team["id"],
        "team_name" => $team["team_name"]
    ]);
    exit;
}

// No team yet
echo json_encode([
    "success" => true,
    "exists" => false
]);
?>
