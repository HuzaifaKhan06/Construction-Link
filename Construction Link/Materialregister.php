<?php
session_start();

// Check if the user is logged in
if (!isset($_SESSION['user_id']) || !isset($_SESSION['email'])) {
    // If not logged in, redirect to login page
    header("Location: login.php");
    exit;
}

// Database connection
try {
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', ''); // Change the username and password if necessary
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Initialize error message variables
$errorMessages = [];
$formData = [];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Get the data from the form
    $companyName = $_POST['companyName'];
    $contactPerson = $_POST['contactPerson'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $operatingRegions = $_POST['operatingRegions'];
    $services = $_POST['services'];
    $productionCapacity = $_POST['productionCapacity'];
    $paymentTerms = $_POST['paymentTerms'];
    $address = $_POST['address'];

    // Store form data to retain values after validation fails
    $formData = $_POST;

    // Validate company name uniqueness
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE companyName = ?");
    $stmt->execute([$companyName]);
    if ($stmt->fetchColumn() > 0) {
        $errorMessages[] = "Company name already exists. Please choose a different name.";
    }

    // Validate phone number uniqueness and length (11 digits)
    if (strlen($phone) !== 11) {
        $errorMessages[] = "Phone number must be exactly 11 digits.";
    } else {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE phone = ?");
        $stmt->execute([$phone]);
        if ($stmt->fetchColumn() > 0) {
            $errorMessages[] = "Phone number already exists. Please provide a different number.";
        }
    }

    // If there are validation errors, do not proceed with database insertion
    if (empty($errorMessages)) {
        // Handle image upload (if any)
        $imagePath = '';
        if (isset($_FILES['companyLogo']) && $_FILES['companyLogo']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = 'uploads/';
            $fileName = basename($_FILES['companyLogo']['name']);
            $imagePath = $uploadDir . time() . "_" . $fileName;
            move_uploaded_file($_FILES['companyLogo']['tmp_name'], $imagePath);
        }

        // Insert data into the database
        try {
            // Prepare the SQL query
            $stmt = $pdo->prepare("INSERT INTO material_providers (user_id, companyName, contactPerson, email, phone, operatingRegions, services, productionCapacity, paymentTerms, address, companyLogo) 
                                   VALUES ((SELECT id FROM users WHERE email = :email), :companyName, :contactPerson, :email, :phone, :operatingRegions, :services, :productionCapacity, :paymentTerms, :address, :companyLogo)");

            // Bind the form data to the SQL query
            $stmt->bindParam(':email', $_SESSION['email']);
            $stmt->bindParam(':companyName', $companyName);
            $stmt->bindParam(':contactPerson', $contactPerson);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':operatingRegions', $operatingRegions);
            $stmt->bindParam(':services', $services);
            $stmt->bindParam(':productionCapacity', $productionCapacity);
            $stmt->bindParam(':paymentTerms', $paymentTerms);
            $stmt->bindParam(':address', $address);
            $stmt->bindParam(':companyLogo', $imagePath);

            // Execute the query
            $stmt->execute();

            // Redirect or show a success message
            echo "<script>alert('Registration successful!'); window.location.href = 'success.php';</script>";
        } catch (PDOException $e) {
            echo "<script>alert('Error: " . $e->getMessage() . "');</script>";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Material Provider Registration</title>
  <link rel="stylesheet" href="css/Materialregister.css" />
  <style>
    /* Custom Styles for Error Messages */
    .error-messages {
        background-color: #ffdddd;
        color: #d8000c;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 5px;
        font-weight: bold;
    }
    .error-messages p {
        margin: 0;
    }
  </style>
</head>
<body>

  <div class="container">
    <!-- Left Division -->
    <div class="left-division">
      <h1>Become a Trusted Material Provider</h1>
      <p>
        Boost your company's visibility, connect with industry-leading clients, 
        and streamline your operations by joining our platform. We connect you 
        with the best in the construction industry.
      </p>
      <h2>Why Register on Our Platform?</h2>
      <ul>
        <li>Access to a larger customer base looking for reliable materials</li>
        <li>Dedicated support & marketing tools to grow your business</li>
        <li>Real-time analytics of your product views and client inquiries</li>
        <li>Opportunity to participate in bulk order deals</li>
        <li>Secure and flexible payment options</li>
      </ul>
      <p class="highlight">
        Our mission is to empower material providers by creating a seamless 
        experience that helps you reach your business goals faster.
      </p>
    </div>

    <!-- Right Division -->
    <div class="right-division">
      <div class="background-image"></div>
      <button id="openFormBtn" class="register-btn">Register</button>

      <!-- Sliding Registration Form -->
      <div id="registrationForm" class="form-container">
        <div class="form-header">
          <h3>Material Provider Registration</h3>
          <span id="closeFormBtn" class="close-btn">&times;</span>
        </div>

        <!-- Form Start -->
        <form method="POST" enctype="multipart/form-data">
          <!-- Display error messages -->
          <?php if (!empty($errorMessages)): ?>
            <div class="error-messages">
              <?php foreach ($errorMessages as $message): ?>
                <p><?php echo $message; ?></p>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>

          <!-- Image Upload + Preview (Circle) -->
          <div class="image-upload-wrapper">
            <div class="circle-container">
              <img id="previewImg" alt="" />
            </div>
            <label for="companyLogo">Upload Your Company Logo</label>
            <input 
              type="file" 
              id="companyLogo" 
              name="companyLogo" 
              accept="image/*"
            />
          </div>

          <!-- Company Information -->
          <label for="companyName">Company Name</label>
          <input 
            type="text" 
            id="companyName" 
            name="companyName" 
            placeholder="Enter your company name"
            value="<?php echo isset($formData['companyName']) ? htmlspecialchars($formData['companyName']) : ''; ?>"
            required
          />

          <label for="contactPerson">Contact Person</label>
          <input 
            type="text" 
            id="contactPerson" 
            name="contactPerson" 
            placeholder="Enter contact person's name"
            value="<?php echo isset($formData['contactPerson']) ? htmlspecialchars($formData['contactPerson']) : ''; ?>"
            required
          />

          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            placeholder="Enter your email"
            value="<?php echo isset($formData['email']) ? htmlspecialchars($formData['email']) : htmlspecialchars($_SESSION['email']); ?>"
            required
          />

          <label for="phone">Phone Number</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            placeholder="Enter your phone number"
            value="<?php echo isset($formData['phone']) ? htmlspecialchars($formData['phone']) : ''; ?>"
            required
          />

          <!-- Business Details -->
          <label for="operatingRegions">Operating Regions</label>
          <input 
            type="text" 
            id="operatingRegions" 
            name="operatingRegions" 
            placeholder="e.g., State, Country, or Region"
            value="<?php echo isset($formData['operatingRegions']) ? htmlspecialchars($formData['operatingRegions']) : ''; ?>"
            required
          />

          <label for="services">Materials/Services Provided</label>
          <textarea 
            id="services" 
            name="services" 
            placeholder="List out the materials or services you provide"
            required
          ><?php echo isset($formData['services']) ? htmlspecialchars($formData['services']) : ''; ?></textarea>

          <label for="productionCapacity">Production Capacity (Monthly)</label>
          <input 
            type="text" 
            id="productionCapacity" 
            name="productionCapacity"
            placeholder="e.g., 10,000 tons of cement, etc."
            value="<?php echo isset($formData['productionCapacity']) ? htmlspecialchars($formData['productionCapacity']) : ''; ?>"
            required
          />

          <label for="paymentTerms">Preferred Payment Terms</label>
          <select id="paymentTerms" name="paymentTerms" required>
            <option value="">Select Payment Terms</option>
            <option value="COD" <?php echo (isset($formData['paymentTerms']) && $formData['paymentTerms'] == 'COD') ? 'selected' : ''; ?>>Cash on Delivery (COD)</option>
            <option value="Net30" <?php echo (isset($formData['paymentTerms']) && $formData['paymentTerms'] == 'Net30') ? 'selected' : ''; ?>>Net 30 days</option>
            <option value="Net60" <?php echo (isset($formData['paymentTerms']) && $formData['paymentTerms'] == 'Net60') ? 'selected' : ''; ?>>Net 60 days</option>
            <option value="Milestone" <?php echo (isset($formData['paymentTerms']) && $formData['paymentTerms'] == 'Milestone') ? 'selected' : ''; ?>>Milestone-based</option>
          </select>

          <!-- Address -->
          <label for="address">Address</label>
          <textarea 
            id="address" 
            name="address" 
            placeholder="Enter your complete address"
            required
          ><?php echo isset($formData['address']) ? htmlspecialchars($formData['address']) : ''; ?></textarea>

          <!-- Terms and Conditions -->
          <div class="checkbox-group">
            <input type="checkbox" id="terms" name="terms" required />
            <label for="terms">I agree to the Terms & Conditions</label>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="submit-btn">Submit</button>
        </form>
        <!-- Form End -->
      </div>
    </div>
  </div>

  <!-- JavaScript -->
  <script src="scripts/Materialregister.js"></script>
</body>
</html>
