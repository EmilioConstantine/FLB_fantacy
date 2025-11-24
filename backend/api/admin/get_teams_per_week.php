<?php
require_once "../../config/db.php";
session_start();
if (empty($_SESSION["is_admin"])) {
    echo json_encode([
        "success" => false,
        "message" => "Admin access only"
    ]);
    exit;
}


$week_number = $_GET["week_number"] ?? null;

if (!$week_number) {
    echo json_encode(["success" => false, "message" => "week_number is required."]);
    exit;
}

// --------------------------------------------------------
// 1) Get all user teams for the given week
// --------------------------------------------------------
$sql = "
    SELECT 
        ut.id AS team_id,
        ut.team_name,
        ut.week_number,
        u.id AS user_id,
        u.username,
        u.email,
        u.budget_remaining
    FROM user_team ut
    JOIN users u ON ut.user_id = u.id
    WHERE ut.week_number = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $week_number);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    echo json_encode([
        "success" => true,
        "teams" => [],
        "message" => "No teams found for this week."
    ]);
    exit;
}

$teams = [];

while ($team = $result->fetch_assoc()) {

    $team_id = $team["team_id"];

    // --------------------------------------------------------
    // 2) Get players + coach for each team
    // --------------------------------------------------------
    $members_sql = "
        SELECT 
            utm.role,
            utm.is_captain,
            p.id AS player_id,
            p.name AS player_name,
            p.team AS player_team,
            p.position AS player_position,
            p.price AS player_price,
            c.id AS coach_id,
            c.name AS coach_name,
            c.team AS coach_team,
            c.price AS coach_price
        FROM user_team_members utm
        LEFT JOIN players p ON utm.player_id = p.id
        LEFT JOIN coaches c ON utm.coach_id = c.id
        WHERE utm.user_team_id = ?
    ";

    $stmt2 = $conn->prepare($members_sql);
    $stmt2->bind_param("i", $team_id);
    $stmt2->execute();
    $members_res = $stmt2->get_result();

    $players = [];
    $coach = null;
    $total_cost = 0;

    while ($m = $members_res->fetch_assoc()) {

        if ($m["role"] === "PLAYER") {
            $players[] = [
                "id"        => $m["player_id"],
                "name"      => $m["player_name"],
                "team"      => $m["player_team"],
                "position"  => $m["player_position"],
                "price"     => (int)$m["player_price"],
                "is_captain"=> (int)$m["is_captain"]
            ];
            $total_cost += (int)$m["player_price"];
        }

        if ($m["role"] === "COACH") {
            $coach = [
                "id"    => $m["coach_id"],
                "name"  => $m["coach_name"],
                "team"  => $m["coach_team"],
                "price" => (int)$m["coach_price"]
            ];
            $total_cost += (int)$m["coach_price"];
        }
    }

    // --------------------------------------------------------
    // Add team to the list
    // --------------------------------------------------------
    $teams[] = [
        "team_id"         => $team["team_id"],
        "team_name"       => $team["team_name"],
        "week_number"     => $team["week_number"],
        "user" => [
            "id"       => $team["user_id"],
            "username" => $team["username"],
            "email"    => $team["email"],
            "budget_remaining" => (int)$team["budget_remaining"]
        ],
        "players"         => $players,
        "coach"           => $coach,
        "total_cost"      => $total_cost
    ];
}

// --------------------------------------------------------
// Final response
// --------------------------------------------------------
echo json_encode([
    "success" => true,
    "count"   => count($teams),
    "teams"   => $teams
]);
?>
