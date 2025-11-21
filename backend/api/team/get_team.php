<?php
require_once "../../config/db.php";

// get values
$user_id     = $_GET["user_id"] ?? null;
$week_number = $_GET["week_number"] ?? null;

if (!$user_id || !$week_number) {
    echo json_encode(["success" => false, "message" => "user_id and week_number are required."]);
    exit;
}

// -----------------------------
// 1) GET user_team row
// -----------------------------
$sql = "SELECT * FROM user_team WHERE user_id = ? AND week_number = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $user_id, $week_number);
$stmt->execute();
$team_result = $stmt->get_result();

if ($team_result->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "No team found for this week."]);
    exit;
}

$team = $team_result->fetch_assoc();
$user_team_id = $team["id"];

// -----------------------------
// 2) GET PLAYERS + COACH FROM user_team_members
// -----------------------------
$members_sql = "
    SELECT utm.id,
           utm.role,
           utm.is_captain,
           p.id AS player_id,
           p.name AS player_name,
           p.team AS player_team,
           p.position,
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

$stmt = $conn->prepare($members_sql);
$stmt->bind_param("i", $user_team_id);
$stmt->execute();
$members_res = $stmt->get_result();

$players = [];
$coach = null;
$total_cost = 0;

while ($row = $members_res->fetch_assoc()) {

    // Player case
    if ($row["role"] === "PLAYER") {
        $players[] = [
            "id"       => $row["player_id"],
            "name"     => $row["player_name"],
            "team"     => $row["player_team"],
            "position" => $row["position"],
            "price"    => (int)$row["player_price"],
            "is_captain" => (int)$row["is_captain"]
        ];

        $total_cost += (int)$row["player_price"];
    }

    // Coach case
    if ($row["role"] === "COACH") {
        $coach = [
            "id"    => $row["coach_id"],
            "name"  => $row["coach_name"],
            "team"  => $row["coach_team"],
            "price" => (int)$row["coach_price"]
        ];

        $total_cost += (int)$row["coach_price"];
    }
}

// -----------------------------
// 3) Fetch user budget
// -----------------------------
$user_sql = "SELECT budget_remaining FROM users WHERE id = ?";
$stmt = $conn->prepare($user_sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_row = $stmt->get_result()->fetch_assoc();

$budget_remaining = (int)$user_row["budget_remaining"];

// -----------------------------
// 4) RESPONSE
// -----------------------------
echo json_encode([
    "success" => true,
    "team" => [
        "team_id"  => $team["id"],
        "team_name" => $team["team_name"],
        "week_number" => $week_number,
        "players" => $players,
        "coach"   => $coach,
        "total_cost" => $total_cost,
        "budget_remaining" => $budget_remaining
    ]
]);
?>
