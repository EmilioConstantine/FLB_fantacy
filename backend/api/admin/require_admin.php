<?php
// backend/api/admin/require_admin.php
session_start();

if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Admin access only"
    ]);
    exit;
}
    