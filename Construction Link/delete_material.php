<?php
session_start();

// Set header to return JSON responses
header('Content-Type: application/json');

// Check if the user is logged in
if (!isset($_SESSION['user_id']) || !isset($_SESSION['email'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}

// Get the raw POST data
$input = json_decode(file_get_contents('php://input'), true);

// Check if 'id' is provided
if (!isset($input['id']) || empty($input['id'])) {
    echo json_encode(['success' => false, 'message' => 'Material ID is required.']);
    exit;
}

$materialId = intval($input['id']);

// Database connection
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', ''); 
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Fetch user's material_provider_id
try {
    $stmt = $pdo->prepare("SELECT mp.id AS material_provider_id FROM material_providers mp JOIN users u ON mp.user_id = u.id WHERE u.email = :email ORDER BY mp.id DESC LIMIT 1");
    $stmt->bindParam(':email', $_SESSION['email']);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Material provider not found.']);
        exit;
    }

    $materialProviderId = $user['material_provider_id'];
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error fetching user data: ' . $e->getMessage()]);
    exit;
}

// Fetch material to ensure it belongs to the current user
try {
    $stmt = $pdo->prepare("SELECT image FROM materials WHERE id = :id AND material_provider_id = :provider_id");
    $stmt->bindParam(':id', $materialId, PDO::PARAM_INT);
    $stmt->bindParam(':provider_id', $materialProviderId, PDO::PARAM_INT);
    $stmt->execute();
    $material = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$material) {
        echo json_encode(['success' => false, 'message' => 'Material not found or you do not have permission to delete it.']);
        exit;
    }

    $imagePath = $material['image'];
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error fetching material data: ' . $e->getMessage()]);
    exit;
}

// Delete the material from the database
try {
    $stmt = $pdo->prepare("DELETE FROM materials WHERE id = :id");
    $stmt->bindParam(':id', $materialId, PDO::PARAM_INT);
    $stmt->execute();

    // Delete the image file from the server
    if (file_exists($imagePath)) {
        unlink($imagePath);
    }

    echo json_encode(['success' => true]);
    exit;
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error deleting material: ' . $e->getMessage()]);
    exit;
}
?>
