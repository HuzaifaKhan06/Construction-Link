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

// Initialize variables
$errorMessages = [];
$successMessage = '';
$noChangesMessage = ''; // New variable to handle no changes
$formData = [];
$existingData = [];

// Fetch existing data for the user
try {
    $stmt = $pdo->prepare("SELECT * FROM material_providers WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $existingData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingData) {
        $errorMessages[] = "There is no data to edit/update.";
    } else {
        // Populate formData with existing data
        $formData = $existingData;
    }
} catch (PDOException $e) {
    $errorMessages[] = "Database error: " . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // If there is existing data, proceed to update
    if ($existingData) {
        // Use the email from the session
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

        // Update formData to retain values after validation
        $formData = $_POST;

        // Check if a new image was uploaded
        $newImageUploaded = isset($_FILES['companyLogo']) && $_FILES['companyLogo']['error'] === UPLOAD_ERR_OK;

        // Prepare submitted data for comparison (excluding companyLogo)
        $submittedData = [
            'companyName' => $companyName,
            'contactPerson' => $contactPerson,
            'phone' => $phone,
            'operatingRegions' => $operatingRegions,
            'services' => $services,
            'productionCapacity' => $productionCapacity,
            'paymentTerms' => $paymentTerms,
            'address' => $address
        ];

        // Prepare existing data for comparison (excluding companyLogo)
        $existingDataForComparison = [
            'companyName' => $existingData['companyName'],
            'contactPerson' => $existingData['contactPerson'],
            'phone' => $existingData['phone'],
            'operatingRegions' => $existingData['operatingRegions'],
            'services' => $existingData['services'],
            'productionCapacity' => $existingData['productionCapacity'],
            'paymentTerms' => $existingData['paymentTerms'],
            'address' => $existingData['address']
        ];

        // Compare submitted data with existing data
        $dataChanged = false;
        foreach ($submittedData as $key => $value) {
            if ($value !== $existingDataForComparison[$key]) {
                $dataChanged = true;
                break;
            }
        }

        // Check if a new image was uploaded
        if ($newImageUploaded) {
            $dataChanged = true;
        }

        if (!$dataChanged) {
            // No changes were made
            $noChangesMessage = "No Changes were made.";
        } else {
            // Proceed with validation

            // Validate company name uniqueness (excluding current user)
            if (empty($companyName)) {
                $errorMessages[] = "Company name is required.";
            } else {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE companyName = ? AND user_id != ?");
                $stmt->execute([$companyName, $_SESSION['user_id']]);
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
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE phone = ? AND user_id != ?");
                $stmt->execute([$phone, $_SESSION['user_id']]);
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

            // Handle image upload (if any)
            $imagePath = $existingData['companyLogo']; // Existing logo path
            if ($newImageUploaded) {
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
                    $newImagePath = $uploadDir . time() . "_" . preg_replace("/[^a-zA-Z0-9.]/", "_", $fileName);
                    if (move_uploaded_file($_FILES['companyLogo']['tmp_name'], $newImagePath)) {
                        // Optionally, delete the old logo if it exists
                        if (!empty($imagePath) && file_exists($imagePath)) {
                            unlink($imagePath);
                        }
                        $imagePath = $newImagePath;
                    } else {
                        $errorMessages[] = "Failed to upload the new company logo.";
                    }
                } else {
                    $errorMessages[] = "Invalid image format. Allowed formats: jpg, jpeg, png, gif, webp.";
                }
            }

            if (empty($errorMessages)) {
                // Update data in the database
                try {
                    $stmt = $pdo->prepare("UPDATE material_providers SET 
                                            companyName = :companyName,
                                            contactPerson = :contactPerson,
                                            phone = :phone,
                                            operatingRegions = :operatingRegions,
                                            services = :services,
                                            productionCapacity = :productionCapacity,
                                            paymentTerms = :paymentTerms,
                                            address = :address,
                                            companyLogo = :companyLogo
                                           WHERE user_id = :user_id");

                    // Bind parameters
                    $stmt->bindParam(':companyName', $companyName);
                    $stmt->bindParam(':contactPerson', $contactPerson);
                    $stmt->bindParam(':phone', $phone);
                    $stmt->bindParam(':operatingRegions', $operatingRegions);
                    $stmt->bindParam(':services', $services);
                    $stmt->bindParam(':productionCapacity', $productionCapacity);
                    $stmt->bindParam(':paymentTerms', $paymentTerms);
                    $stmt->bindParam(':address', $address);
                    $stmt->bindParam(':companyLogo', $imagePath);
                    $stmt->bindParam(':user_id', $_SESSION['user_id']);

                    // Execute the update
                    $stmt->execute();

                    $successMessage = "Changes saved successfully!";
                    
                    // Optionally, refresh the existing data
                    $formData = [
                        'companyName' => $companyName,
                        'contactPerson' => $contactPerson,
                        'email' => $email,
                        'phone' => $phone,
                        'operatingRegions' => $operatingRegions,
                        'services' => $services,
                        'productionCapacity' => $productionCapacity,
                        'paymentTerms' => $paymentTerms,
                        'address' => $address,
                        'companyLogo' => $imagePath
                    ];
                    $existingData = $formData;
                } catch (PDOException $e) {
                    $errorMessages[] = "Database error: " . $e->getMessage();
                }
            }
        }
    } else {
        // If no existing data
        $errorMessages[] = "There is no data to edit/update.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Material Provider</title>
    <link rel="stylesheet" href="css/edit_material_provider.css">
    <style>
        /* Styles for alert popup */
        .alert-popup {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #f44336; /* Red */
            color: white;
            padding: 20px;
            z-index: 1000;
            border-radius: 5px;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .alert-popup.show {
            display: block;
            animation: fadein 0.5s, fadeout 0.5s 2.5s;
        }
        @keyframes fadein {
            from { top: 0; opacity: 0; }
            to { top: 20px; opacity: 1; }
        }
        @keyframes fadeout {
            from { top: 20px; opacity: 1; }
            to { top: 0; opacity: 0; }
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

    <!-- Success Popup Container -->
    <div id="successPopup" class="success-popup">
        <span id="closeSuccessPopupBtn" class="close-popup">&times;</span>
        <h2>Success</h2>
        <p id="successMessage"></p>
    </div>

    <!-- Alert Popup Container for No Changes -->
    <div id="alertPopup" class="alert-popup">
        <p id="alertMessage">No Changes were made.</p>
    </div>

    <div class="edit-container">
        <?php if ($existingData): ?>
            <div class="form-container">
                <div class="form-header">
                    <h3>Edit Material Provider Profile</h3>
                </div>
                <form method="POST" enctype="multipart/form-data" id="editForm">
                    <!-- Image Upload + Preview (Circle) -->
                    <div class="image-upload-wrapper">
                        <div class="circle-container">
                            <?php if (!empty($formData['companyLogo']) && file_exists($formData['companyLogo'])): ?>
                                <img id="previewImg" src="<?php echo htmlspecialchars($formData['companyLogo']); ?>" alt="Company Logo">
                            <?php else: ?>
                                <img id="previewImg" src="default-logo.png" alt="Company Logo">
                            <?php endif; ?>
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

                    <!-- Submit Button -->
                    <button type="submit" class="submit-btn">Save Changes</button>
                </form>
            </div>
        <?php else: ?>
            <div class="no-data-message">
                <h2>There is no data to edit/update.</h2>
                <p>Please register first to create your material provider profile.</p>
                <a href="Materialregister.php" class="register-btn">Register Now</a>
            </div>
        <?php endif; ?>
    </div>

    <script src="scripts/edit_material_provider.js"></script>

    <!-- Inline JavaScript to handle PHP messages -->
    <?php if (!empty($errorMessages)): ?>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                const errors = <?php echo json_encode($errorMessages); ?>;
                showErrorPopup(errors);
            });
        </script>
    <?php endif; ?>

    <?php if (!empty($successMessage)): ?>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                const message = "<?php echo $successMessage; ?>";
                showSuccessPopup(message);
                
                // Redirect to MaterialProviders.php after a short delay
                setTimeout(function() {
                    window.location.href = "MaterialProviders.php";
                }, 2000); // 2 seconds delay
            });
        </script>
    <?php endif; ?>

    <?php if (!empty($noChangesMessage)): ?>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                const alertPopup = document.getElementById('alertPopup');
                const alertMessage = document.getElementById('alertMessage');
                alertMessage.textContent = "<?php echo $noChangesMessage; ?>";
                alertPopup.classList.add('show');

                // Automatically hide the alert after 3 seconds
                setTimeout(function() {
                    alertPopup.classList.remove('show');
                }, 3000);
            });
        </script>
    <?php endif; ?>
</body>
</html>
