<?php
require_once "../../config/db.php";

// Optional filters
$team  = $_GET["team"]  ?? null;
$sort  = $_GET["sort"]  ?? "price";
$order = $_GET["order"] ?? "ASC";

// Allowed sort fields
$allowed_sorts = ["name", "team", "price"];
if (!in_array($sort, $allowed_sorts)) {
    $sort = "price";
}

$order = strtoupper($order) === "DESC" ? "DESC" : "ASC";

// --------------------------------------
// Build SQL with optional filters
// --------------------------------------
$sql = "SELECT * FROM coaches WHERE 1=1";

if ($team) {
    $sql .= " AND team = '" . $conn->real_escape_string($team) . "'";
}

$sql .= " ORDER BY $sort $order";

$result = $conn->query($sql);

$coaches = [];

while ($row = $result->fetch_assoc()) {
    $coaches[] = [
        "id"           => (int)$row["id"],
        "name"         => $row["name"],
        "team"         => $row["team"],
        "price"        => (int)$row["price"],
        "bonus_points" => (int)$row["bonus_points"]
    ];
}

// --------------------------------------
// Response
// --------------------------------------
echo json_encode([
    "success" => true,
    "count"   => count($coaches),
    "coaches" => $coaches
]);
?>
