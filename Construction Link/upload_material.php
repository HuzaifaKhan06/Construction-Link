<?php
session_start();

// Set header to return JSON responses
header('Content-Type: application/json');

// Check if the user is logged in
if (!isset($_SESSION['user_id']) || !isset($_SESSION['email'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access. Please log in.']);
    exit;
}

// Database connection
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', ''); 
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Fetch user information and material_provider_id
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

// Initialize an array to hold errors
$errors = [];

// Validate and sanitize inputs
$materialName = isset($_POST['materialName']) ? trim($_POST['materialName']) : '';
$price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
$quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 0;
$materialType = isset($_POST['materialType']) ? trim($_POST['materialType']) : '';
$unit = isset($_POST['unit']) ? trim($_POST['unit']) : '';
$description = isset($_POST['description']) ? trim($_POST['description']) : '';

// Validate required fields
if (empty($materialName)) {
    $errors['materialName'] = 'Material name is required.';
}

if ($price <= 0) {
    $errors['price'] = 'Please enter a valid price.';
}

if ($quantity <= 0) {
    $errors['quantity'] = 'Please enter a valid quantity.';
}

if (empty($materialType)) {
    $errors['materialType'] = 'Material type is required.';
}

if (empty($unit)) {
    $errors['unit'] = 'Unit of measurement is required.';
}

if (empty($description)) {
    $errors['description'] = 'Description is required.';
}

// Handle image upload
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errors['image'] = 'Image is required.';
} else {
    $image = $_FILES['image'];

    // Validate image size (optional, e.g., max 5MB)
    if ($image['size'] > 5 * 1024 * 1024) { // 5MB
        $errors['image'] = 'Image size should not exceed 5MB.';
    }

    // Validate image type
    $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $image['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimeTypes)) {
        $errors['image'] = 'Only JPEG, PNG, and GIF images are allowed.';
    }
}

// If there are validation errors, return them
if (!empty($errors)) {
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// Process image upload
$uploadDir = 'uploads/';
$uniqueFileName = uniqid('material_', true) . '.' . pathinfo($image['name'], PATHINFO_EXTENSION);
$uploadPath = $uploadDir . $uniqueFileName;

// Move the uploaded file to the uploads directory
if (!move_uploaded_file($image['tmp_name'], $uploadPath)) {
    echo json_encode(['success' => false, 'message' => 'Failed to upload the image.']);
    exit;
}

// Insert material data into the database
try {
    $stmt = $pdo->prepare("INSERT INTO materials (materialName, price, quantity, materialType, unit, description, image, material_provider_id) VALUES (:materialName, :price, :quantity, :materialType, :unit, :description, :image, :material_provider_id)");
    $stmt->bindParam(':materialName', $materialName);
    $stmt->bindParam(':price', $price);
    $stmt->bindParam(':quantity', $quantity, PDO::PARAM_INT);
    $stmt->bindParam(':materialType', $materialType);
    $stmt->bindParam(':unit', $unit);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':image', $uploadPath);
    $stmt->bindParam(':material_provider_id', $materialProviderId, PDO::PARAM_INT);
    $stmt->execute();

    // Get the inserted material's ID
    $materialId = $pdo->lastInsertId();

    // Return success response with material data
    echo json_encode([
        'success' => true,
        'material' => [
            'id' => $materialId,
            'materialName' => htmlspecialchars($materialName),
            'price' => number_format($price, 2),
            'quantity' => htmlspecialchars($quantity),
            'materialType' => htmlspecialchars($materialType),
            'unit' => htmlspecialchars($unit),
            'description' => htmlspecialchars($description),
            'image' => htmlspecialchars($uploadPath)
        ]
    ]);
    exit;
} catch (PDOException $e) {
    // Delete the uploaded image if database insertion fails
    if (file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    echo json_encode(['success' => false, 'message' => 'Error inserting data into the database: ' . $e->getMessage()]);
    exit;
}
?>
