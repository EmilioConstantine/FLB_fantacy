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

