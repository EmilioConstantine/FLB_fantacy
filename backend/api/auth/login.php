<?php
require_once "../../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

$email    = $data["email"] ?? "";
$password = $data["password"] ?? "";

// Validate fields
if (!$email || !$password) {
    echo json_encode([
        "success" => false,
        "message" => "Email and password are required."
    ]);
    exit;
}

// Get user by email
$sql = "SELECT * FROM users WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "User not found."
    ]);
    exit;
}

$user = $result->fetch_assoc();

// Verify password
if (!password_verify($password, $user["password"])) {
    echo json_encode([
        "success" => false,
        "message" => "Incorrect password."
    ]);
    exit;
}

// Success
echo json_encode([
    "success" => true,
    "message" => "Login successful.",
    "user" => [
        "id"               => $user["id"],
        "username"         => $user["username"],
        "email"            => $user["email"],
        "budget_remaining" => $user["budget_remaining"]
    ]
]);
?>
