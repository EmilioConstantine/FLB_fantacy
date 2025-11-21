<?php
require_once "../../config/db.php";

$query     = $_GET["q"] ?? "";      // search term
$team      = $_GET["team"] ?? null;
$position  = $_GET["position"] ?? null;
$max_price = $_GET["max_price"] ?? null;
$sort      = $_GET["sort"] ?? "price";
$order     = $_GET["order"] ?? "ASC";

// Allowed sorting fields
$allowed_sorts = ["name", "price", "team"];
if (!in_array($sort, $allowed_sorts)) {
    $sort = "price";
}

$order = strtoupper($order) === "DESC" ? "DESC" : "ASC";

// --------------------------------------------
// Build SQL
// --------------------------------------------
$sql = "SELECT * FROM players WHERE 1=1";

// Search by name (case insensitive)
if (!empty($query)) {
    $q = $conn->real_escape_string($query);
    $sql .= " AND name LIKE '%$q%'";
}

// Team filter
if ($team) {
    $sql .= " AND team = '" . $conn->real_escape_string($team) . "'";
}

// Position filter
if ($position) {
    $sql .= " AND position = '" . $conn->real_escape_string($position) . "'";
}

// Price filter
if ($max_price) {
    $max_price = intval($max_price);
    $sql .= " AND price <= $max_price";
}

// Sorting
$sql .= " ORDER BY $sort $order";

$result = $conn->query($sql);

$players = [];

while ($row = $result->fetch_assoc()) {
    $players[] = [
        "id"       => (int)$row["id"],
        "name"     => $row["name"],
        "team"     => $row["team"],
        "position" => $row["position"],
        "price"    => (int)$row["price"]
    ];
}

echo json_encode([
    "success" => true,
    "count"   => count($players),
    "players" => $players
]);
?>
