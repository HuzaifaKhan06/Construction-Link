<?php
session_start();
header('Content-Type: application/json');
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}
$user_id = $_SESSION['user_id'];
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?");
$stmt->execute([$user_id]);

echo json_encode(['success' => true]);
exit;
?>
