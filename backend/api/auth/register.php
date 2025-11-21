<?php
require_once "../../config/db.php";

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);

$username = $data["username"] ?? "";
$email    = $data["email"] ?? "";
$password = $data["password"] ?? "";

// Validate fields
if (!$username || !$email || !$password) {
    echo json_encode([
        "success" => false,
        "message" => "username, email and password are required"
    ]);
    exit;
}

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Prepare and execute INSERT query
$sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sss", $username, $email, $hashedPassword);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "User registered successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Email already exists or database error."
    ]);
}
?>
