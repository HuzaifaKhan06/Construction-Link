<?php
session_start();
header('Content-Type: application/json');

// We need to check if there's an order_id either in the session or passed as a parameter
$order_id = isset($_GET['order_id']) ? $_GET['order_id'] : ($_SESSION['order_id'] ?? null);

if (!$order_id) {
    echo json_encode(["error" => "No order ID found."]);
    exit;
}

try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// First get the order status to make sure we're looking at a confirmed order
$stmtOrderStatus = $pdo->prepare("SELECT order_status FROM orders WHERE id = ?");
$stmtOrderStatus->execute([$order_id]);
$orderStatus = $stmtOrderStatus->fetch(PDO::FETCH_ASSOC);

if (!$orderStatus) {
    echo json_encode(["error" => "Order not found."]);
    exit;
}

// Check if order_delivery_details exists for this specific order
$stmt = $pdo->prepare("
    SELECT * FROM order_delivery_details 
    WHERE order_id = ? 
    ORDER BY created_at DESC LIMIT 1
");
$stmt->execute([$order_id]);
$deliveryDetails = $stmt->fetch(PDO::FETCH_ASSOC);

if ($deliveryDetails) {
    // Get order items
    $stmtOrderItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $stmtOrderItems->execute([$order_id]);
    $orderItems = $stmtOrderItems->fetchAll(PDO::FETCH_ASSOC);
    
    $subtotal = 0;
    foreach ($orderItems as $item) {
        $subtotal += $item['subtotal'];
    }
    
    $shipping_fee = 50; // Assuming this is fixed
    $order_total = $subtotal + $shipping_fee;
    
    echo json_encode([
        "success" => true,
        "delivery_time" => $deliveryDetails['delivery_time'],
        "delivery_message" => $deliveryDetails['delivery_message'],
        "order_items" => $orderItems,
        "subtotal" => $subtotal,
        "shipping_fee" => $shipping_fee,
        "order_total" => $order_total,
        "status" => $orderStatus['order_status']
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No delivery information has been provided by the service provider yet.",
        "status" => $orderStatus['order_status']
    ]);
}
?>