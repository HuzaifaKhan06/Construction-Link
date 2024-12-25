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
$materialId = isset($_POST['id']) ? intval($_POST['id']) : 0;
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

// Check if material exists and belongs to the user
try {
    $stmt = $pdo->prepare("SELECT * FROM materials WHERE id = :id AND material_provider_id = :provider_id");
    $stmt->bindParam(':id', $materialId, PDO::PARAM_INT);
    $stmt->bindParam(':provider_id', $materialProviderId, PDO::PARAM_INT);
    $stmt->execute();
    $existingMaterial = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingMaterial) {
        echo json_encode(['success' => false, 'message' => 'Material not found or you do not have permission to edit it.']);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error fetching material data: ' . $e->getMessage()]);
    exit;
}

// Handle image upload (optional)
$imagePath = $existingMaterial['image']; // Default to existing image
$imageUpdated = false;

if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
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

// Check if any changes were made
$changesMade = false;
$fieldsToUpdate = [];
$params = [];

// Compare each field to see if it has changed
if ($materialName !== $existingMaterial['materialName']) {
    $fieldsToUpdate[] = 'materialName = :materialName';
    $params[':materialName'] = $materialName;
    $changesMade = true;
}

if ($price != $existingMaterial['price']) { // Use != for float comparison
    $fieldsToUpdate[] = 'price = :price';
    $params[':price'] = $price;
    $changesMade = true;
}

if ($quantity != $existingMaterial['quantity']) {
    $fieldsToUpdate[] = 'quantity = :quantity';
    $params[':quantity'] = $quantity;
    $changesMade = true;
}

if ($materialType !== $existingMaterial['materialType']) {
    $fieldsToUpdate[] = 'materialType = :materialType';
    $params[':materialType'] = $materialType;
    $changesMade = true;
}

if ($unit !== $existingMaterial['unit']) {
    $fieldsToUpdate[] = 'unit = :unit';
    $params[':unit'] = $unit;
    $changesMade = true;
}

if ($description !== $existingMaterial['description']) {
    $fieldsToUpdate[] = 'description = :description';
    $params[':description'] = $description;
    $changesMade = true;
}

// Handle image update
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = 'uploads/';
    $uniqueFileName = uniqid('material_', true) . '.' . pathinfo($image['name'], PATHINFO_EXTENSION);
    $uploadPath = $uploadDir . $uniqueFileName;

    // Move the uploaded file to the uploads directory
    if (!move_uploaded_file($image['tmp_name'], $uploadPath)) {
        echo json_encode(['success' => false, 'message' => 'Failed to upload the image.']);
        exit;
    }

    // Set the new image path
    $fieldsToUpdate[] = 'image = :image';
    $params[':image'] = $uploadPath;
    $changesMade = true;
    $imageUpdated = true;
}

// If no changes were made, notify the user
if (!$changesMade) {
    echo json_encode(['success' => false, 'message' => 'No changes were made.']);
    exit;
}

// Update the database
try {
    $sql = "UPDATE materials SET " . implode(', ', $fieldsToUpdate) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => &$value) {
        // Determine parameter type
        if ($key === ':price') {
            $stmt->bindParam($key, $value, PDO::PARAM_STR); // Using PARAM_STR for decimal
        } elseif ($key === ':quantity') {
            $stmt->bindParam($key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindParam($key, $value);
        }
    }
    $stmt->bindParam(':id', $materialId, PDO::PARAM_INT);
    $stmt->execute();

    // If image was updated, delete the old image
    if ($imageUpdated && file_exists($existingMaterial['image'])) {
        unlink($existingMaterial['image']);
    }

    // Fetch the updated material data
    $stmt = $pdo->prepare("SELECT * FROM materials WHERE id = :id");
    $stmt->bindParam(':id', $materialId, PDO::PARAM_INT);
    $stmt->execute();
    $updatedMaterial = $stmt->fetch(PDO::FETCH_ASSOC);

    // Return success response with updated material data
    echo json_encode([
        'success' => true,
        'material' => [
            'id' => $updatedMaterial['id'],
            'materialName' => htmlspecialchars($updatedMaterial['materialName']),
            'price' => number_format($updatedMaterial['price'], 2),
            'quantity' => htmlspecialchars($updatedMaterial['quantity']),
            'materialType' => htmlspecialchars($updatedMaterial['materialType']),
            'unit' => htmlspecialchars($updatedMaterial['unit']),
            'description' => htmlspecialchars($updatedMaterial['description']),
            'image' => htmlspecialchars($updatedMaterial['image'])
        ]
    ]);
    exit;
} catch (PDOException $e) {
    // Delete the uploaded image if database update fails
    if ($imageUpdated && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    echo json_encode(['success' => false, 'message' => 'Error updating data in the database: ' . $e->getMessage()]);
    exit;
}
?>
