<?php
require_once "../../config/db.php";
session_start();
if (empty($_SESSION["is_admin"])) {
    echo json_encode([
        "success" => false,
        "message" => "Admin access only"
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$mode = $data["mode"] ?? null;

if (!$mode) {
    echo json_encode(["success" => false, "message" => "mode is required (single/batch/auto)."]);
    exit;
}

/**
 * MODE 1: Single player manual update
 */
if ($mode === "single") {

    $player_id = $data["player_id"] ?? null;
    $new_price = $data["new_price"] ?? null;

    if (!$player_id || !$new_price) {
        echo json_encode(["success" => false, "message" => "player_id and new_price required"]);
        exit;
    }

    $check = $conn->prepare("SELECT id FROM players WHERE id = ?");
    $check->bind_param("i", $player_id);
    $check->execute();
    if ($check->get_result()->num_rows == 0) {
        echo json_encode(["success" => false, "message" => "Player not found."]);
        exit;
    }

    $update = $conn->prepare("UPDATE players SET price = ? WHERE id = ?");
    $update->bind_param("ii", $new_price, $player_id);
    $update->execute();

    echo json_encode([
        "success" => true,
        "message" => "Player price updated successfully."
    ]);
    exit;
}

/**
 * MODE 2: Batch manual update
 */
if ($mode === "batch") {

    $updates = $data["updates"] ?? null;

    if (!$updates || !is_array($updates)) {
        echo json_encode(["success" => false, "message" => "updates array required"]);
        exit;
    }

    foreach ($updates as $u) {

        if (!isset($u["player_id"]) || !isset($u["new_price"])) {
            echo json_encode(["success" => false, "message" => "player_id and new_price required in updates"]);
            exit;
        }

        $player_id = (int)$u["player_id"];
        $new_price = (int)$u["new_price"];

        $check = $conn->prepare("SELECT id FROM players WHERE id = ?");
        $check->bind_param("i", $player_id);
        $check->execute();
        if ($check->get_result()->num_rows == 0) {
            echo json_encode(["success" => false, "message" => "Player ID $player_id not found."]);
            exit;
        }

        $update = $conn->prepare("UPDATE players SET price = ? WHERE id = ?");
        $update->bind_param("ii", $new_price, $player_id);
        $update->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Batch price update completed successfully."
    ]);
    exit;
}

/**
 * MODE 3: Automatic update based on performance
 *
 * Input:
 *   { mode: "auto", week_number: 1 }
 *
 * Algorithm:
 *   - Compute average fantasy_points for that week.
 *   - For each player with stats:
 *        perf_ratio = (fp - avg) / avg
 *        delta%    = 0.1 * perf_ratio   (10% scaling)
 *        clamp delta% between -0.2 and +0.2  (max ±20%)
 *        new_price = round(price * (1 + delta%)), min 1
 *   - Players without stats for the week decay slightly (-5%).
 */

if ($mode === "auto") {

    $week_number = isset($data["week_number"]) ? (int)$data["week_number"] : 0;
    if ($week_number <= 0) {
        echo json_encode(["success" => false, "message" => "week_number is required for auto mode."]);
        exit;
    }

    // Get stats for this week
    $stats_sql = "
        SELECT player_id, fantasy_points
        FROM weekly_stats
        WHERE week_number = ?
    ";
    $st = $conn->prepare($stats_sql);
    $st->bind_param("i", $week_number);
    $st->execute();
    $res = $st->get_result();

    if ($res->num_rows == 0) {
        echo json_encode(["success" => false, "message" => "No weekly_stats rows for this week."]);
        exit;
    }

    $rows = [];
    $sum_fp = 0;
    $count  = 0;

    while ($r = $res->fetch_assoc()) {
        $rows[] = $r;
        $sum_fp += (int)$r["fantasy_points"];
        $count++;
    }

    $avg_fp = $count > 0 ? $sum_fp / $count : 0;
    if ($avg_fp <= 0) $avg_fp = 1; // avoid /0

    $updated = 0;

    foreach ($rows as $r) {
        $pid = (int)$r["player_id"];
        $fp  = (int)$r["fantasy_points"];

        // Get current price
        $pstmt = $conn->prepare("SELECT price FROM players WHERE id = ?");
        $pstmt->bind_param("i", $pid);
        $pstmt->execute();
        $prow = $pstmt->get_result()->fetch_assoc();
        if (!$prow) continue;

        $current = (int)$prow["price"];

        // performance ratio
        $ratio = ($fp - $avg_fp) / $avg_fp;          // ±1.0 means 100% above/below average
        $delta = 0.10 * $ratio;                     // 10% sensitivity
        if ($delta > 0.20) $delta = 0.20;           // cap +20%
        if ($delta < -0.20) $delta = -0.20;         // cap -20%

        $new_price = (int)round($current * (1 + $delta));
        if ($new_price < 1) $new_price = 1;

        $up = $conn->prepare("UPDATE players SET price = ? WHERE id = ?");
        $up->bind_param("ii", $new_price, $pid);
        $up->execute();

        $updated++;
    }

    // Small decay for players who did not play that week
    $decay = $conn->prepare("
        UPDATE players 
        SET price = GREATEST(1, ROUND(price * 0.95))
        WHERE id NOT IN (
            SELECT DISTINCT player_id 
            FROM weekly_stats 
            WHERE week_number = ?
        )
    ");
    $decay->bind_param("i", $week_number);
    $decay->execute();

    echo json_encode([
        "success" => true,
        "message" => "Automatic price update completed.",
        "avg_fp"  => $avg_fp,
        "updated_players" => $updated
    ]);
    exit;
}

// Invalid mode
echo json_encode(["success" => false, "message" => "Invalid mode. Use 'single', 'batch' or 'auto'."]);
?>
