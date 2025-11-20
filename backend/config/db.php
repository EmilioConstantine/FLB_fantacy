<?php

$host = "localhost";
$user = "root";        // default XAMPP username
$pass = "";            // default XAMPP password (empty)
$dbname = "flb_fantacy";  // <-- YOUR DATABASE NAME

$conn = mysqli_connect($host, $user, $pass, $dbname);

// Check connection
if(!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

?>
