<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['order_id'])) {
    echo json_encode(['error' => 'Order not found']);
    exit;
}

$order_id = $_SESSION['order_id'];

try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$stmt = $pdo->prepare("SELECT order_status, created_at FROM orders WHERE id = ?");
$stmt->execute([$order_id]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if ($order) {
    // Check if delivery details exist for this order
    $stmtDelivery = $pdo->prepare("
        SELECT ts.* 
        FROM time_storage ts
        WHERE ts.label = ? 
        AND ts.message != ''
        LIMIT 1
    ");
    $stmtDelivery->execute(['order_' . $order_id]);
    $deliveryDetails = $stmtDelivery->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status'     => $order['order_status'],
        'created_at' => $order['created_at'],
        'delivery_details_added' => !empty($deliveryDetails) && !empty($deliveryDetails['message'])
    ]);
} else {
    echo json_encode(['error' => 'Order not found']);
}
?>