<?php
session_start();
header('Content-Type: application/json');

// Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

// Validate required POST data
if (!isset($_POST['product_id'], $_POST['product_name'], $_POST['product_image'], $_POST['price'])) {
    echo json_encode(['success' => false, 'error' => 'Incomplete data']);
    exit;
}

$product_id = $_POST['product_id'];
$product_name = $_POST['product_name'];
$product_image = $_POST['product_image'];
$price = $_POST['price'];
$user_id = $_SESSION['user_id'];

// Connect to the database
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Check if the item is already in the cart for this user
$stmt = $pdo->prepare("SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?");
$stmt->execute([$user_id, $product_id]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    // Update quantity if it exists
    $newQuantity = $existing['quantity'] + 1;
    $update = $pdo->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?");
    $update->execute([$newQuantity, $existing['id']]);
} else {
    // Insert new cart item with quantity = 1
    $insert = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, product_name, product_image, price, quantity) VALUES (?, ?, ?, ?, ?, 1)");
    $insert->execute([$user_id, $product_id, $product_name, $product_image, $price]);
}

// Get the updated cart count
$stmtCount = $pdo->prepare("SELECT COUNT(*) FROM cart_items WHERE user_id = ?");
$stmtCount->execute([$user_id]);
$cart_count = $stmtCount->fetchColumn();

echo json_encode(['success' => true, 'cart_count' => $cart_count]);
exit;
?>
