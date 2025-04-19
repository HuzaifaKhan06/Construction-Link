<?php
// upload_work.php
session_start();
if(!isset($_SESSION['company_id'])) {
  echo json_encode(['success' => false, 'message' => 'Unauthorized']);
  exit;
}
try {
  $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
  echo json_encode(['success' => false, 'message' => 'Database connection failed']);
  exit;
}

if($_SERVER['REQUEST_METHOD'] === 'POST') {
  $companyId = $_SESSION['company_id'];
  $description = $_POST['workDescription'];
  if(isset($_FILES['workImage']) && $_FILES['workImage']['error'] === 0) {
    $uploadDir = "uploads/work/";
    if(!is_dir($uploadDir)) {
      mkdir($uploadDir, 0777, true);
    }
    $imagePath = $uploadDir . basename($_FILES['workImage']['name']);
    if(move_uploaded_file($_FILES['workImage']['tmp_name'], $imagePath)) {
      $stmt = $pdo->prepare("INSERT INTO construction_work (construction_company_id, image, description) VALUES (:companyId, :image, :description)");
      $stmt->bindParam(':companyId', $companyId, PDO::PARAM_INT);
      $stmt->bindParam(':image', $imagePath);
      $stmt->bindParam(':description', $description);
      if($stmt->execute()){
        echo json_encode(['success' => true]);
        exit;
      }
    }
  }
  echo json_encode(['success' => false, 'message' => 'Error uploading work']);
} else {
  echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
?>
