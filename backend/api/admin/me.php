<?php
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION["is_admin"]) || $_SESSION["is_admin"] !== true) {
    echo json_encode([
        "success" => false,
        "message" => "Not logged in"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "admin" => [
        "id" => $_SESSION["admin_id"] ?? null,
        "username" => $_SESSION["admin_username"] ?? null
    ]
]);
