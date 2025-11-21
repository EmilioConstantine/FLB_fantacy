<?php
require_once "../../config/db.php";

$user_id = $_GET["user_id"] ?? null;

if (!$user_id) {
    echo json_encode(["success" => false, "message" => "user_id is required."]);
    exit;
}

// -------------------------------------------------------------
// 1) Get user info
// -------------------------------------------------------------
$user_sql = "
    SELECT username, email, budget_remaining
    FROM users
    WHERE id = ?
";
$stmt = $conn->prepare($user_sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_res = $stmt->get_result();

if ($user_res->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "User not found."]);
    exit;
}

$user = $user_res->fetch_assoc();

// -------------------------------------------------------------
// 2) Get weekly fantasy points for this user
// -------------------------------------------------------------
$history_sql = "
    SELECT week_number, fantasy_points
    FROM user_points
    WHERE user_id = ?
    ORDER BY week_number ASC
";
$stmt = $conn->prepare($history_sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();

$history_res = $stmt->get_result();

$weeks = [];
$total = 0;
$max_points = -1;
$min_points = 999999;
$best_week = null;
$worst_week = null;

while ($row = $history_res->fetch_assoc()) {

    $week = (int)$row["week_number"];
    $points = (int)$row["fantasy_points"];

    $weeks[] = [
        "week_number" => $week,
        "fantasy_points" => $points
    ];

    // Track stats
    $total += $points;

    if ($points > $max_points) {
        $max_points = $points;
        $best_week = $week;
    }

    if ($points < $min_points) {
        $min_points = $points;
        $worst_week = $week;
    }
}

$average = count($weeks) > 0 ? round($total / count($weeks), 2) : 0;

// -------------------------------------------------------------
// 3) Final response
// -------------------------------------------------------------
echo json_encode([
    "success" => true,
    "user" => [
        "username" => $user["username"],
        "email" => $user["email"],
        "budget_remaining" => (int)$user["budget_remaining"]
    ],
    "totals" => [
        "total_points" => $total,
        "average_points" => $average,
        "best_week" => $best_week,
        "best_points" => $max_points,
        "worst_week" => $worst_week,
        "worst_points" => $min_points
    ],
    "history" => $weeks
]);
?>
