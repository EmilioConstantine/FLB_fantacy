<?php
// backend/api/admin/login.php
require_once "../../config/db.php";

session_start();
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

// 1) Simple validation
if (!$username || !$password) {
    echo json_encode(["success" => false, "message" => "username and password required"]);
    exit;
}

// 2) Fetch admin from DB
$sql = "SELECT id, username, password FROM admin WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$res = $stmt->get_result();
$admin = $res->fetch_assoc();

if (!$admin) {
    echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    exit;
}

// 3) Check password
// If you stored plain text: ($password === $admin['password'])
// If you hashed it: password_verify($password, $admin['password']);

if ($password !== $admin['password']) {
    echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    exit;
}

// 4) Mark session as admin
session_regenerate_id(true);
$_SESSION['admin_id'] = $admin['id'];
$_SESSION['admin_username'] = $admin['username'];
$_SESSION['is_admin'] = true;

echo json_encode([
    "success" => true,
    "message" => "Admin login OK",
    "admin" => [
        "id"       => $admin['id'],
        "username" => $admin['username'],
        "role"     => "admin"
    ]
]);
