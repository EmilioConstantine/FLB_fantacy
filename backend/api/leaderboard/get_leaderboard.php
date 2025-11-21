<?php
require_once "../../config/db.php";

// Optional: show weekly breakdown if ?details=1
$show_details = isset($_GET["details"]) && $_GET["details"] == "1";

// ---------------------------------------
// 1) GET TOTAL FANTASY POINTS PER USER
// ---------------------------------------
$sql = "
    SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        SUM(up.fantasy_points) AS total_points
    FROM user_points up
    JOIN users u ON up.user_id = u.id
    GROUP BY up.user_id
    ORDER BY total_points DESC
";

$result = $conn->query($sql);

$leaderboard = [];

while ($row = $result->fetch_assoc()) {

    $entry = [
        "user_id"  => $row["user_id"],
        "username" => $row["username"],
        "email"    => $row["email"],
        "total_points" => (int)$row["total_points"]
    ];

    // ------------------------------------
    // 2) OPTIONAL: Weekly breakdown
    // ------------------------------------
    if ($show_details) {
        $week_sql = "
            SELECT week_number, fantasy_points
            FROM user_points
            WHERE user_id = ?
            ORDER BY week_number ASC
        ";
        $stmt = $conn->prepare($week_sql);
        $stmt->bind_param("i", $row["user_id"]);
        $stmt->execute();
        $week_res = $stmt->get_result();

        $weeks = [];
        while ($w = $week_res->fetch_assoc()) {
            $weeks[] = [
                "week" => (int)$w["week_number"],
                "points" => (int)$w["fantasy_points"]
            ];
        }

        $entry["weekly_breakdown"] = $weeks;
    }

    $leaderboard[] = $entry;
}

// ---------------------------------------
// 3) RESPONSE
// ---------------------------------------
echo json_encode([
    "success" => true,
    "leaderboard" => $leaderboard
]);
?>
