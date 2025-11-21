<?php
require_once "../../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

$week_number = $data["week_number"] ?? null;

if (!$week_number) {
    echo json_encode(["success" => false, "message" => "week_number is required."]);
    exit;
}

// ----------------------------------------
// 1) PREVENT DUPLICATE CALCULATION
// ----------------------------------------
$check = $conn->prepare("
    SELECT COUNT(*) AS count 
    FROM user_points 
    WHERE week_number = ?
");
$check->bind_param("i", $week_number);
$check->execute();
$exists = $check->get_result()->fetch_assoc()["count"];

if ($exists > 0) {
    echo json_encode(["success" => false, "message" => "Points already calculated for this week."]);
    exit;
}

// ----------------------------------------
// 2) GET ALL USER TEAMS FOR THIS WEEK
// ----------------------------------------
$team_sql = "
    SELECT id, user_id 
    FROM user_team 
    WHERE week_number = ?
";
$stmt = $conn->prepare($team_sql);
$stmt->bind_param("i", $week_number);
$stmt->execute();
$teams_res = $stmt->get_result();

if ($teams_res->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "No teams found for this week."]);
    exit;
}

while ($team = $teams_res->fetch_assoc()) {

    $user_team_id = $team["id"];
    $user_id = $team["user_id"];
    $total_fantasy_points = 0;

    // ----------------------------------------
    // 3) GET TEAM MEMBERS
    // ----------------------------------------
    $members_sql = "
        SELECT utm.*, p.price AS player_price, c.bonus_points AS coach_bonus
        FROM user_team_members utm
        LEFT JOIN players p ON utm.player_id = p.id
        LEFT JOIN coaches c ON utm.coach_id = c.id
        WHERE utm.user_team_id = ?
    ";
    $members_stmt = $conn->prepare($members_sql);
    $members_stmt->bind_param("i", $user_team_id);
    $members_stmt->execute();
    $members_res = $members_stmt->get_result();

    while ($m = $members_res->fetch_assoc()) {

        // -------------------------
        // A) PLAYER FANTASY POINTS
        // -------------------------
        if ($m["role"] === "PLAYER" && $m["player_id"]) {

            $player_id = $m["player_id"];
            $is_captain = $m["is_captain"];

            // Get weekly stats
            $stats_sql = "
                SELECT * FROM weekly_stats 
                WHERE player_id = ? AND week_number = ?
            ";
            $stats_stmt = $conn->prepare($stats_sql);
            $stats_stmt->bind_param("ii", $player_id, $week_number);
            $stats_stmt->execute();
            $stats = $stats_stmt->get_result()->fetch_assoc();

            if ($stats) {
                $fp = 
                    $stats["points"] * 1 +
                    $stats["rebounds"] * 1.2 +
                    $stats["assists"] * 1.5 +
                    $stats["steals"] * 3 +
                    $stats["blocks"] * 3 +
                    $stats["turnovers"] * -1;

                if ($is_captain == 1) {
                    $fp *= 2; // double captain score
                }

                $total_fantasy_points += $fp;
            }
        }

        // -------------------------
        // B) COACH BONUS
        // -------------------------
        if ($m["role"] === "COACH") {
            $total_fantasy_points += $m["coach_bonus"];
        }
    }

    // ----------------------------------------
    // 4) INSERT USER POINTS INTO `user_points`
    // ----------------------------------------
    $insert = $conn->prepare("
        INSERT INTO user_points (user_id, week_number, fantasy_points)
        VALUES (?, ?, ?)
    ");
    $insert->bind_param("iii", $user_id, $week_number, $total_fantasy_points);
    $insert->execute();
}

// ----------------------------------------
// 5) RESPONSE
// ----------------------------------------
echo json_encode([
    "success" => true,
    "message" => "Fantasy points calculated for week $week_number"
]);
?>
