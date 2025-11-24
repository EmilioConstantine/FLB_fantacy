<?php
session_start();
header("Content-Type: application/json");

// Destroy session
$_SESSION = [];
session_destroy();

echo json_encode([
    "success" => true,
    "message" => "Admin logged out"
]);
