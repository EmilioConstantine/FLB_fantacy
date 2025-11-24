<?php
session_start();
require_once "../../config/db.php";

header("Content-Type: application/json");

// Read JSON body
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$username = $data["username"] ?? "";
$password = $data["password"] ?? "";

if (!$username || !$password) {
    echo json_encode([
        "success" => false,
        "message" => "username and password are required"
    ]);
    exit;
}

// Fetch admin row by username
$sql = "SELECT id, username, password FROM admin WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();
$admin = $res->fetch_assoc();

// ❌ NO PASSWORD HASHING — DIRECT COMPARE
if (!$admin || $password !== $admin["password"]) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid credentials"
    ]);
    exit;
}

// Valid → Set session
$_SESSION["is_admin"] = true;
$_SESSION["admin_id"] = $admin["id"];
$_SESSION["admin_username"] = $admin["username"];

echo json_encode([
    "success" => true,
    "message" => "Admin logged in",
    "admin" => [
        "id" => $admin["id"],
        "username" => $admin["username"]
    ]
]);
