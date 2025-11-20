<?php
require_once "../config/db.php";

$email = $_POST['email'];
$password = $_POST['password'];

$sql = "SELECT * FROM users WHERE email = '$email'";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) == 1) {

    $user = mysqli_fetch_assoc($result);

    if (password_verify($password, $user['password'])) {

        session_start();
        $_SESSION['user_id'] = $user['id'];

        echo json_encode([
            "status" => "success",
            "message" => "Login successful"
        ]);

    } else {
        echo json_encode(["status" => "error", "message" => "Invalid password"]);
    }

} else {
    echo json_encode(["status" => "error", "message" => "User not found"]);
}

?>
