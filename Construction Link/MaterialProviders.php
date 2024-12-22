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

// Fetch user information
try {
    $stmt = $pdo->prepare("SELECT mp.companyName, mp.companyLogo FROM material_providers mp JOIN users u ON mp.user_id = u.id WHERE u.email = :email ORDER BY mp.id DESC LIMIT 1");
    $stmt->bindParam(':email', $_SESSION['email']);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // If user details not found, redirect to registration
        header("Location: Materialregister.php");
        exit;
    }

    $companyName = htmlspecialchars($user['companyName']);
    $companyLogo = htmlspecialchars($user['companyLogo']);
} catch (PDOException $e) {
    die("Error fetching user data: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Material Provider Dashboard</title>
    <link rel="stylesheet" href="css/material_providers.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css">
</head>

<body>
    <div class="dashboard-container">
        <!-- Navigation Bar -->
        <nav class="navbar">
            <div class="logo">Construction Link</div>
            <ul class="nav-links">
                <li><a href="#">Create Design</a></li>
                <li><a href="#">Upload Items</a></li>
                <li><a href="#">View Orders</a></li>
                <li><a href="#">Sales</a></li>
                <li class="dropdown">
                    <a href="#">Switch Profile</a>
                    <div class="dropdown-content">
                        <a href="#">Switch to Users</a>
                    </div>
                </li>
                <li>
                    <!-- Profile Icon with Company Logo -->
                    <a href="#" class="profile-icon">
                        <?php if (!empty($companyLogo) && file_exists($companyLogo)): ?>
                            <img src="<?php echo $companyLogo; ?>" alt="<?php echo $companyName; ?> Logo">
                        <?php else: ?>
                            <i class="fas fa-user-circle"></i>
                        <?php endif; ?>
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Dashboard Header -->
        <header class="dashboard-header">
            <h1>Material Provider Dashboard</h1>
            <p class="welcome-message">Welcome, <span><?php echo $companyName; ?></span></p>
        </header>

        <!-- Material Cards Section -->
        <section class="material-section">
            <!-- Example Material Card -->
            <div class="material-card">
                <div class="image-placeholder">Image</div>
                <div class="material-info">
                    <p>Price: <span>$10</span></p>
                    <p>Description: <span>High-quality cement</span></p>
                </div>
                <div class="action-buttons">
                    <button class="edit-button">Edit</button>
                    <button class="delete-button">Delete</button>
                </div>
            </div>
            <!-- Add more cards dynamically if needed -->
        </section>
    </div>

    <!-- Optional: JavaScript for Dropdown Functionality -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const dropdown = document.querySelector('.dropdown');
            const dropdownContent = dropdown.querySelector('.dropdown-content');

            dropdown.addEventListener('click', function(event) {
                event.preventDefault();
                dropdownContent.classList.toggle('show');
            });

            // Close the dropdown if clicked outside
            window.onclick = function(event) {
                if (!dropdown.contains(event.target)) {
                    dropdownContent.classList.remove('show');
                }
            };
        });
    </script>
</body>

</html>
