<?php
session_start();
if (!isset($_SESSION['email'])) {
  echo json_encode(['error' => 'Not authenticated']);
  exit;
}

// Database connection
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error'=>'Database connection failed']);
    exit;
}

// Fetch the material provider ID using the logged-in user's email
$stmt = $pdo->prepare("SELECT mp.id AS material_provider_id FROM material_providers mp 
                       JOIN users u ON mp.user_id = u.id 
                       WHERE u.email = :email 
                       ORDER BY mp.id DESC LIMIT 1");
$stmt->bindParam(':email', $_SESSION['email']);
$stmt->execute();
$provider = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$provider) {
    echo json_encode(['error' => 'Provider not found']);
    exit;
}
$provider_id = $provider['material_provider_id'];

// Query pending orders count
$stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE service_provider_id = :provider_id AND order_status = 'pending'");
$stmtCount->bindParam(':provider_id', $provider_id, PDO::PARAM_INT);
$stmtCount->execute();
$count = $stmtCount->fetchColumn();

echo json_encode(['count' => $count]);
?>
