<?php
require_once "../config/db.php";

$username = $_POST['username'];
$email = $_POST['email'];
$password = $_POST['password'];

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Insert user
$sql = "INSERT INTO users (username, email, password)
        VALUES ('$username', '$email', '$hashedPassword')";

if (mysqli_query($conn, $sql)) {
    echo json_encode(["status" => "success", "message" => "User registered"]);
} else {
    echo json_encode(["status" => "error", "message" => "Email already exists"]);
}

?>
