<?php
require_once "../../config/db.php";

// Optional filters
$team       = $_GET["team"]       ?? null;
$position   = $_GET["position"]   ?? null;
$max_price  = $_GET["max_price"]  ?? null;
$sort       = $_GET["sort"]       ?? "price";   // price or name
$order      = $_GET["order"]      ?? "ASC";     // ASC / DESC

// Validate sort values
$allowed_sorts = ["price", "name"];
if (!in_array($sort, $allowed_sorts)) {
    $sort = "price";
}

$order = ($order === "DESC") ? "DESC" : "ASC";

// ---------------------------------------------
// BUILD SQL QUERY WITH OPTIONAL FILTERS
// ---------------------------------------------

$sql = "SELECT * FROM players WHERE 1=1";

// Filter by team
if ($team) {
    $sql .= " AND team = '" . $conn->real_escape_string($team) . "'";
}

// Filter by position
if ($position) {
    $sql .= " AND position = '" . $conn->real_escape_string($position) . "'";
}

// Filter by price
if ($max_price) {
    $max_price = intval($max_price);
    $sql .= " AND price <= $max_price";
}

$sql .= " ORDER BY $sort $order";

$result = $conn->query($sql);

$players = [];

while ($row = $result->fetch_assoc()) {
    $players[] = [
        "id"       => $row["id"],
        "name"     => $row["name"],
        "team"     => $row["team"],
        "position" => $row["position"],
        "price"    => (int)$row["price"]
    ];
}

echo json_encode([
    "success" => true,
    "count" => count($players),
    "players" => $players
]);
?>
