<?php
function is_week_locked($conn, $week_number) {
  $sql = "SELECT is_locked FROM week_settings WHERE week_number = ?";
  $st = $conn->prepare($sql);
  $st->bind_param("i", $week_number);
  $st->execute();
  $row = $st->get_result()->fetch_assoc();

  // If week doesn't exist in table -> treat as unlocked (or lock by default if you prefer)
  return ($row && (int)$row["is_locked"] === 1);
}
