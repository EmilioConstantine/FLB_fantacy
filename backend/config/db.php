<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$host = "localhost";
$user = "root";
$pass = ""; // XAMPP default
$dbname = "flb_fantacy"; // make sure this EXACT name exists in phpMyAdmin

$conn = mysqli_connect($host, $user, $pass, $dbname);

if (!$conn) {
    die(json_encode([
        "success" => false,
        "message" => "Database connection failed: " . mysqli_connect_error()
    ]));
}
// After $conn = new mysqli(...);

// --- CREATE DEFAULT ADMIN IF TABLE EMPTY ---
$checkAdmin = $conn->query("SELECT COUNT(*) AS cnt FROM admin");
$row = $checkAdmin->fetch_assoc();

if ($row['cnt'] == 0) {
    // insert default admin
    $username = 'admin';
    $password = password_hash('admin', PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO admin (username, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $username, $password);
    $stmt->execute();
}

?>
