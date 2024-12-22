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

// **1. Check if the user has already registered**
try {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $registrationCount = $stmt->fetchColumn();

    if ($registrationCount > 0) {
        $errorMessages[] = "This email has already been registered.";
    }
} catch (PDOException $e) {
    $errorMessages[] = "Database error: " . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($errorMessages)) {
    // **2. Use the email from the session instead of POST data**
    // This ensures the email field is static and cannot be altered by the user
    $email = $_SESSION['email'];

    // Get the data from the form
    $companyName = trim($_POST['companyName']);
    $contactPerson = trim($_POST['contactPerson']);
    $phone = trim($_POST['phone']);
    $operatingRegions = trim($_POST['operatingRegions']);
    $services = trim($_POST['services']);
    $productionCapacity = trim($_POST['productionCapacity']);
    $paymentTerms = trim($_POST['paymentTerms']);
    $address = trim($_POST['address']);

    // Store form data to retain values after validation fails
    $formData = $_POST;

    // Validate company name uniqueness
    if (empty($companyName)) {
        $errorMessages[] = "Company name is required.";
    } else {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE companyName = ?");
        $stmt->execute([$companyName]);
        if ($stmt->fetchColumn() > 0) {
            $errorMessages[] = "Company name already exists. Please choose a different name.";
        }
    }

    // Validate phone number uniqueness and length (11 digits)
    if (empty($phone)) {
        $errorMessages[] = "Phone number is required.";
    } elseif (!ctype_digit($phone)) {
        $errorMessages[] = "Phone number must contain only digits.";
    } elseif (strlen($phone) !== 11) {
        $errorMessages[] = "Phone number must be exactly 11 digits.";
    } else {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE phone = ?");
        $stmt->execute([$phone]);
        if ($stmt->fetchColumn() > 0) {
            $errorMessages[] = "Phone number already exists. Please provide a different number.";
        }
    }

    // Validate other required fields
    if (empty($contactPerson)) {
        $errorMessages[] = "Contact person is required.";
    }
    if (empty($operatingRegions)) {
        $errorMessages[] = "Operating regions are required.";
    }
    if (empty($services)) {
        $errorMessages[] = "Materials/Services provided are required.";
    }
    if (empty($productionCapacity)) {
        $errorMessages[] = "Production capacity is required.";
    }
    if (empty($paymentTerms)) {
        $errorMessages[] = "Payment terms are required.";
    }
    if (empty($address)) {
        $errorMessages[] = "Address is required.";
    }
    if (!isset($_POST['terms'])) {
        $errorMessages[] = "You must agree to the Terms & Conditions.";
    }

    // Handle image upload (if any)
    $imagePath = '';
    if (isset($_FILES['companyLogo']) && $_FILES['companyLogo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/';
        // Create the uploads directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $fileName = basename($_FILES['companyLogo']['name']);
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        // Validate file type (optional)
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (in_array(strtolower($fileExtension), $allowedExtensions)) {
            $imagePath = $uploadDir . time() . "_" . preg_replace("/[^a-zA-Z0-9.]/", "_", $fileName);
            move_uploaded_file($_FILES['companyLogo']['tmp_name'], $imagePath);
        } else {
            $errorMessages[] = "Invalid image format. Allowed formats: jpg, jpeg, png, gif, webp.";
        }
    }

    // If image upload failed due to invalid format
    if (empty($errorMessages)) {
        // Insert data into the database
        try {
            // **3. Use user_id from session directly**
            $stmt = $pdo->prepare("INSERT INTO material_providers (user_id, companyName, contactPerson, email, phone, operatingRegions, services, productionCapacity, paymentTerms, address, companyLogo) 
                                   VALUES (:user_id, :companyName, :contactPerson, :email, :phone, :operatingRegions, :services, :productionCapacity, :paymentTerms, :address, :companyLogo)");

            // Bind the form data to the SQL query
            $stmt->bindParam(':user_id', $_SESSION['user_id']);
            $stmt->bindParam(':companyName', $companyName);
            $stmt->bindParam(':contactPerson', $contactPerson);
            $stmt->bindParam(':email', $email); // Using session email
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':operatingRegions', $operatingRegions);
            $stmt->bindParam(':services', $services);
            $stmt->bindParam(':productionCapacity', $productionCapacity);
            $stmt->bindParam(':paymentTerms', $paymentTerms);
            $stmt->bindParam(':address', $address);
            $stmt->bindParam(':companyLogo', $imagePath);

            // Execute the query
            $stmt->execute();

            // Redirect to MaterialProviders.php upon successful registration
            echo "<script>
                    alert('Registration successful!');
                    window.location.href = 'MaterialProviders.php';
                  </script>";
            exit;
        } catch (PDOException $e) {
            $errorMessages[] = "Database error: " . $e->getMessage();
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
    /* Custom Styles for Error Popup */
    .error-popup {
      display: none; /* Hidden by default */
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ffdddd;
      color: #d8000c;
      border: 1px solid #d8000c;
      padding: 20px;
      z-index: 1000;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      width: 90%;
      max-width: 500px;
    }

    .error-popup h2 {
      margin-top: 0;
      font-size: 1.5rem;
    }

    .error-popup ul {
      list-style-type: disc;
      padding-left: 20px;
    }

    .error-popup .close-popup {
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 1.5rem;
      cursor: pointer;
      color: #d8000c;
    }

    /* Optional: Hide the registration form if already registered */
    <?php if ($registrationCount > 0): ?>
      .form-container {
        display: none;
      }
      .already-registered-message {
        display: block;
        color: #d8000c;
        background-color: #ffdddd;
        padding: 20px;
        border: 1px solid #d8000c;
        border-radius: 5px;
        margin: 20px;
        text-align: center;
        opacity: 1; /* Ensure full opacity */
        transition: opacity 0.3s ease;
      }
    <?php else: ?>
      .already-registered-message {
        display: none;
      }
    <?php endif; ?>

    /* Styles for the "Move to Dashboard" button */
    .move-dashboard-btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
      transition: background-color 0.3s ease;
      opacity: 1; /* Ensure full opacity */
    }

    .move-dashboard-btn:hover {
      background-color: #45a049;
    }

    /* Optional: Ensure the button is positioned correctly */
    .right-division {
      position: relative;
    }

    /* Optional: Z-index to ensure elements are on top */
    .already-registered-message, .move-dashboard-btn {
      z-index: 10;
    }
  </style>
</head>
<body>

  <!-- Error Popup Container -->
  <div id="errorPopup" class="error-popup">
    <span id="closePopupBtn" class="close-popup">&times;</span>
    <h2>Form Submission Errors</h2>
    <ul id="errorList">
      <!-- Errors will be populated here -->
    </ul>
  </div>

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
      <?php if ($registrationCount == 0): ?>
        <button id="openFormBtn" class="register-btn">Register</button>
      <?php endif; ?>

      <!-- Message for Already Registered Users -->
      <?php if ($registrationCount > 0): ?>
        <div class="already-registered-message">
          <h2>You have already registered.</h2>
          <p>If you need to update your registration details, please contact support.</p>
        </div>
        <!-- **4. "Move to Dashboard" Button Placed Outside the Message Div** -->
        <a href="MaterialProviders.php" class="move-dashboard-btn">Move to Dashboard</a>
      <?php endif; ?>

      <!-- Sliding Registration Form -->
      <div id="registrationForm" class="form-container">
        <div class="form-header">
          <h3>Material Provider Registration</h3>
          <span id="closeFormBtn" class="close-btn">&times;</span>
        </div>

        <!-- Form Start -->
        <form method="POST" enctype="multipart/form-data">
          <!-- Remove the in-form error messages
          <?php if (!empty($errorMessages)): ?>
            <div class="error-messages">
              <?php foreach ($errorMessages as $message): ?>
                <p><?php echo $message; ?></p>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
          -->

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
            value="<?php echo htmlspecialchars($_SESSION['email']); ?>"
            readonly
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

  <!-- Inline JavaScript to handle error popup -->
  <?php if (!empty($errorMessages)): ?>
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        const errors = <?php echo json_encode($errorMessages); ?>;
        showErrorPopup(errors);
      });
    </script>
  <?php endif; ?>

  <script>
    // JavaScript for Popup Functionality

    // Function to display the error popup
    function showErrorPopup(errors) {
      const popup = document.getElementById('errorPopup');
      const errorList = document.getElementById('errorList');
      const closeBtn = document.getElementById('closePopupBtn');

      // Clear any existing errors
      errorList.innerHTML = '';

      // Populate the errors
      errors.forEach(function(error) {
        const li = document.createElement('li');
        li.textContent = error;
        errorList.appendChild(li);
      });

      // Show the popup
      popup.style.display = 'block';

      // Close button handler
      closeBtn.onclick = function() {
        popup.style.display = 'none';
      };

      // Optional: Close the popup when clicking outside the popup content
      window.onclick = function(event) {
        if (event.target == popup) {
          popup.style.display = 'none';
        }
      };
    }

    // Optional: Prevent opening the form if already registered
    <?php if ($registrationCount > 0): ?>
      document.getElementById('openFormBtn')?.remove(); // Remove the Register button
    <?php endif; ?>
  </script>
</body>
</html>
