<?php
session_start();
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$order_id = $_POST['order_id'] ?? null;
if (!$order_id) {
    echo json_encode(['error' => 'Missing order ID']);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Delete order items, delivery info, and order record
try {
    $pdo->beginTransaction();
    $stmt1 = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
    $stmt1->execute([$order_id]);
    $stmt2 = $pdo->prepare("DELETE FROM delivery_info WHERE order_id = ?");
    $stmt2->execute([$order_id]);
    $stmt3 = $pdo->prepare("DELETE FROM orders WHERE id = ?");
    $stmt3->execute([$order_id]);
    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['error' => 'Failed to clear order']);
}
?>
