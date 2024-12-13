<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php"); // Redirect if not logged in
    exit();
}

$user_id = $_SESSION['user_id'];

try {
    // Connect to the database with error reporting enabled
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Check if the user exists in the commonusers table
    $stmt = $pdo->prepare("SELECT * FROM commonusers WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // If user is not found, set the email to the username field
        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $email = $stmt->fetch(PDO::FETCH_ASSOC)['email'];
        $user = [
            'first_name' => '',
            'last_name' => '',
            'username' => $email,  // Set email as username if no profile exists
            'cnic' => '',
            'phone_number' => '',
            'profile_image' => ''
        ];
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
    exit();
}

// Handling profile update
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $first_name = trim($_POST['first_name']);
    $last_name = trim($_POST['last_name']);
    $username = trim($_POST['username']);
    $cnic = trim($_POST['cnic']);
    $phone_number = trim($_POST['phone_number']);

    // Handle Profile Picture Upload
    $profile_picture = $user['profile_image'];
    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] == 0) {
        $target_dir = "uploads/";
        $target_file = $target_dir . basename($_FILES['profile_picture']['name']);
        
        // Validate file type
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
        if (in_array($_FILES['profile_picture']['type'], $allowed_types)) {
            if (move_uploaded_file($_FILES['profile_picture']['tmp_name'], $target_file)) {
                $profile_picture = basename($_FILES['profile_picture']['name']);
            } else {
                echo "Error uploading the file.";
                exit();
            }
        } else {
            echo "Invalid file type. Only JPG, PNG, and GIF are allowed.";
            exit();
        }
    }

    // Validate all form fields before updating
    if (empty($first_name) || empty($last_name) || empty($username) || empty($cnic) || empty($phone_number)) {
        echo "Please fill out all fields.";
        exit();
    }

    try {
        // Update or insert user data
        if ($user && !empty($user['user_id'])) {
            // Check for changes
            $stmt = $pdo->prepare("SELECT * FROM commonusers WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);

            $data_changed = (
                $existing_user['first_name'] !== $first_name ||
                $existing_user['last_name'] !== $last_name ||
                $existing_user['username'] !== $username ||
                $existing_user['cnic'] !== $cnic ||
                $existing_user['phone_number'] !== $phone_number ||
                $existing_user['profile_image'] !== $profile_picture
            );

            if ($data_changed) {
                // Update existing user data
                $stmt = $pdo->prepare("UPDATE commonusers SET first_name = ?, last_name = ?, username = ?, cnic = ?, phone_number = ?, profile_image = ? WHERE user_id = ?");
                $stmt->execute([$first_name, $last_name, $username, $cnic, $phone_number, $profile_picture, $user_id]);
                header("Location: EditProfile.php?success=1");
                exit();
            } else {
                echo "No changes were made to the profile.";
                exit();
            }
        } else {
            // Insert new user data if no profile exists
            $stmt = $pdo->prepare("INSERT INTO commonusers (user_id, first_name, last_name, username, cnic, phone_number, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$user_id, $first_name, $last_name, $username, $cnic, $phone_number, $profile_picture]);
            header("Location: EditProfile.php?success=1");
            exit();
        }
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage();
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile</title>
    <link rel="stylesheet" href="css/editProfile.css">
</head>
<body>
    <div class="profile-container">
        <h1>Edit Your Profile</h1>

        <?php if (isset($_GET['success'])): ?>
            <p class="success-message">Your profile has been updated successfully!</p>
        <?php endif; ?>

        <form action="EditProfile.php" method="POST" enctype="multipart/form-data">
            <div class="form-group">
                <label for="first_name">First Name</label>
                <input type="text" id="first_name" name="first_name" value="<?php echo htmlspecialchars($user['first_name']); ?>" required>
            </div>

            <div class="form-group">
                <label for="last_name">Last Name</label>
                <input type="text" id="last_name" name="last_name" value="<?php echo htmlspecialchars($user['last_name']); ?>" required>
            </div>

            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required>
            </div>

            <div class="form-group">
                <label for="cnic">CNIC (13 digits)</label>
                <input type="text" id="cnic" name="cnic" maxlength="13" minlength="13" pattern="\d{13}" value="<?php echo htmlspecialchars($user['cnic']); ?>" required>
            </div>

            <div class="form-group">
                <label for="phone_number">Phone Number</label>
                <input type="text" id="phone_number" name="phone_number" pattern="\d{11}" value="<?php echo htmlspecialchars($user['phone_number']); ?>" required>
            </div>

            <div class="form-group">
                <label for="profile_picture">Profile Picture</label>
                <input type="file" id="profile_picture" name="profile_picture" accept="image/*">
                <div class="profile-picture-preview" id="preview-container">
                    <?php if ($user['profile_image']) { ?>
                        <img src="uploads/<?php echo htmlspecialchars($user['profile_image']); ?>" alt="Profile Picture" id="image-preview">
                    <?php } else { ?>
                        <p>No profile picture uploaded</p>
                    <?php } ?>
                </div>
            </div>

            <button type="submit" class="update-button">Save Changes</button>
        </form>
    </div>

    <script>
        const profileInput = document.getElementById('profile_picture');
        const previewContainer = document.getElementById('preview-container');
        const imagePreview = document.getElementById('image-preview');

        profileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (!imagePreview) {
                        const img = document.createElement('img');
                        img.id = 'image-preview';
                        img.src = e.target.result;
                        img.style.borderRadius = '50%';
                        previewContainer.innerHTML = '';
                        previewContainer.appendChild(img);
                    } else {
                        imagePreview.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    </script>
</body>
</html>
