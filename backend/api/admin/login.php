<?php
// backend/api/admin/login.php

require_once "../../config/db.php";
header("Content-Type: application/json");

// allow pre-flight from the test UI
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// read JSON body
$raw  = file_get_contents("php://input");
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

/**
 * 0) Ensure there is at least ONE admin.
 *    If table is empty, we create the default:
 *      username: admin
 *      password: admin  (stored as a hash)
 */
$cntRes = $conn->query("SELECT COUNT(*) AS c FROM admin");
$rowCnt = $cntRes ? $cntRes->fetch_assoc() : ["c" => 0];

if ((int)$rowCnt["c"] === 0) {
    $defaultUser = "admin";
    $defaultPassHash = password_hash("admin", PASSWORD_DEFAULT);

    $seed = $conn->prepare("INSERT INTO admin (username, password) VALUES (?, ?)");
    if ($seed) {
        $seed->bind_param("ss", $defaultUser, $defaultPassHash);
        $seed->execute();
        $seed->close();
    }
}

/**
 * 1) Fetch admin row by username
 */
$stmt = $conn->prepare("SELECT id, username, password FROM admin WHERE username = ? LIMIT 1");
if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "DB error: " . $conn->error
    ]);
    exit;
}
$stmt->bind_param("s", $username);
$stmt->execute();
$res  = $stmt->get_result();
$admin = $res->fetch_assoc();
$stmt->close();

if (!$admin) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid credentials"
    ]);
    exit;
}

$hash = $admin["password"];

/**
 * 2) Support both hashed and legacy plain-text passwords:
 *    - preferred: password_verify()
 *    - fallback: direct string compare (if you previously saved "admin" as plain text)
 */
$ok = false;

if (password_verify($password, $hash)) {
    $ok = true;

    // OPTIONAL: if hash needs rehash, you can update it here later
} elseif ($hash === $password) {
    // legacy plain text, treat as valid and (optionally) upgrade:
    $ok = true;

    // upgrade to a real hash for better security:
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $upd = $conn->prepare("UPDATE admin SET password = ? WHERE id = ?");
    if ($upd) {
        $upd->bind_param("si", $newHash, $admin["id"]);
        $upd->execute();
        $upd->close();
    }
}

if (!$ok) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid credentials"
    ]);
    exit;
}

// 3) SUCCESS
echo json_encode([
    "success" => true,
    "message" => "Admin login successful",
    "admin"   => [
        "id"       => (int)$admin["id"],
        "username" => $admin["username"]
    ]
]);
