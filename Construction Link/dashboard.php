<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: Login.php"); // Redirect if not logged in
    exit();
}

$user_id = $_SESSION['user_id'];

try {
    // Connect to the database
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch user details from 'users' table
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Fetch additional profile data if needed
        $stmt = $pdo->prepare("SELECT * FROM commonusers WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            // Handle users without a profile in 'commonusers'
            $profile = [
                'first_name' => '',
                'last_name' => '',
                'username' => $user['email'],  // Use email as username
                'cnic' => '',
                'phone_number' => '',
                'profile_image' => ''
            ];
        }
    } else {
        echo "<script>alert('User not found.'); window.location.href='Login.php';</script>";
        exit();
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
    exit();
}

// Initialize user information variables
$user_id = $_SESSION['user_id'];
$user_name = "";
$profile_image = "";

try {
    // Establish database connection
    $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Fetch user details from commonusers table
    $stmt = $pdo->prepare("SELECT first_name, last_name, username, profile_image FROM commonusers WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        if (!empty($user['first_name']) && !empty($user['last_name'])) {
            $user_name = $user['first_name'] . ' ' . $user['last_name'];
        } else {
            $user_name = $user['username'];
        }
        $profile_image = $user['profile_image'];
    } else {
        // Fallback to users table if not found in commonusers
        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $user_info = $stmt->fetch(PDO::FETCH_ASSOC);
        $user_name = $user_info ? $user_info['email'] : 'User';
    }

    // Fetch up to three latest material items from the database
    $stmt = $pdo->prepare("SELECT * FROM materials ORDER BY id DESC LIMIT 3");
    $stmt->execute();
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo "Error: " . htmlspecialchars($e->getMessage());
    exit();
}

// Handle the "Switch to Material Provider" action
if (isset($_GET['action']) && $_GET['action'] === 'switch_material') {
    try {
        // Establish database connection
        $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);

        // Prepare and execute the query to check registration
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM material_providers WHERE user_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $isRegistered = $stmt->fetchColumn() > 0;

        if ($isRegistered) {
            header("Location: MaterialProviders.php"); // Redirect to MaterialProviders.php
        } else {
            header("Location: Materialregister.php"); // Redirect to Materialregister.php
        }
        exit();
    } catch (PDOException $e) {
        // Handle database connection errors
        echo "Database Error: " . htmlspecialchars($e->getMessage());
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>User Dashboard</title>
  <!-- Link to External CSS -->
  <link rel="stylesheet" href="./css/DashBoard.css">
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css" integrity="sha512-5Hs3dF2AEPkpNAR7UiOHba+lRSJNeM2ECkwxUIxC1Q/FLycGTbNapWXB4tP889k5T5Ju8fs4b1P5z/iB4nMfSQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  
  <!-- Additional CSS for Material Cards -->
  <style>
    /* Material Card Styles for Dashboard */
    .material-card-dashboard {
        background-color: #fff;
        width: 100%;
        max-width: 300px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        text-align: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 15px;
    }

    .material-card-dashboard:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .material-card-dashboard img.material-image {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-bottom: 1px solid #34495E;
    }

    .material-info-dashboard {
        padding: 15px;
        text-align: left;
        width: 100%;
    }

    .material-info-dashboard p {
        margin: 8px 0;
        font-size: 14px;
        color: #333;
    }

    .material-info-dashboard p strong {
        color: #16a085;
    }

    /* Container for Material Cards */
    .material-items {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        padding: 20px;
    }

    /* Message when no materials are available */
    .no-materials-message {
        text-align: center;
        font-size: 1.2em;
        color: #555;
        margin-top: 20px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .material-card-dashboard {
            max-width: 90%;
        }
    }
  </style>
</head>
<body>

  <!-- Navigation Bar -->
  <nav class="navbar">
    <div class="logo">Construction Link</div>
    <ul class="nav-links">
      <li><a href="./CreateDesign.php">Create House Design</a></li>
      <li><a href="#materialEstimation">Estimate Material Costs</a></li>
      <li><a href="#costEstimation">Cost Estimation</a></li>
      <li class="dropdown">
        <span class="dropbtn">Switch Profile <i class="fa fa-caret-down"></i></span>
        <div class="dropdown-content">
          <a href="dashboard.php?action=switch_material">Switch to Material Provider</a>
          <a href="#">Switch to Construction Company</a>
        </div>
      </li>
      <li class="dropdown">
        <a href="#" class="user-icon">
          <?php if (!empty($profile_image)): ?>
            <img src="uploads/<?php echo htmlspecialchars($profile_image); ?>" alt="Profile Image" class="profile-img">
          <?php else: ?>
            <i class="fa-solid fa-user"></i>
          <?php endif; ?>
        </a>
        <div class="dropdown-content sub-content">
          <a href="./EditProfile.php">Edit Profile</a>
          <a href="./Logout.php">Logout</a>
        </div>
      </li>
    </ul>
  </nav>

  <!-- Dashboard Section -->
  <div class="dashboard">
    <h1>User View Dashboard</h1>
    <h2>Welcome, <?php echo htmlspecialchars($user_name); ?></h2>
  </div>

  <!-- Material Items Section -->
  <section class="material-items-section">
    <h2 class="material-heading">Material Items</h2>
    <div class="material-items">
      <?php if (!empty($materials)): ?>
        <?php foreach ($materials as $material): ?>
          <div class="material-card-dashboard">
            <img src="<?php echo htmlspecialchars($material['image']); ?>" alt="<?php echo htmlspecialchars($material['materialName']); ?>" class="material-image">
            <div class="material-info-dashboard">
              <p><strong>Name:</strong> <?php echo htmlspecialchars($material['materialName']); ?></p>
              <!-- Removed the materialType line; now just showing price, quantity, unit, description -->
              <p><strong>Price:</strong> PKR <?php echo number_format($material['price'], 2); ?></p>
              <p><strong>Quantity:</strong> <?php echo htmlspecialchars($material['quantity']); ?></p>
              <p><strong>Unit:</strong> <?php echo htmlspecialchars($material['unit']); ?></p>
              <p><strong>Description:</strong> <?php echo htmlspecialchars($material['description']); ?></p>
            </div>
          </div>
        <?php endforeach; ?>
      <?php else: ?>
        <p class="no-materials-message">No material required now.</p>
      <?php endif; ?>
    </div>
  </section>

  <!-- Construction Companies Section -->
  <section class="construction-companies">
      <h2>Construction Companies</h2>
      <div class="construction-company" id="company1">
        <img src="imgs/img-1.webp" alt="" width="250px" height="200px">
      </div>
      <div class="construction-company" id="company2">
      <img src="imgs/img-2.webp" alt="" width="250px" height="200px">
      </div>
      <div class="construction-company" id="company3">
      <img src="imgs/img-3.webp" alt="" width="250px" height="200px">
      </div>
  </section>

  <!-- JavaScript -->
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll(".carousel-images img");
    const totalSlides = slides.length;

    function moveSlide(direction) {
      currentSlide += direction;
      if (currentSlide < 0) {
        currentSlide = totalSlides - 1;
      } else if (currentSlide >= totalSlides) {
        currentSlide = 0;
      }
      updateCarousel();
    }

    function updateCarousel() {
      const offset = -currentSlide * 100;
      document.querySelector(".carousel-images").style.transform = `translateX(${offset}%)`;
    }

    // Auto slide every 5 seconds (optional)
    if (totalSlides > 0) {
      setInterval(() => moveSlide(1), 5000);
    }

    // Handle Dropdowns
    document.querySelectorAll(".dropdown > .dropbtn, .dropdown > .user-icon").forEach(function(element) {
      element.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        this.parentElement.querySelector(".dropdown-content").classList.toggle("show");
      });
    });

    // Close dropdowns when clicking outside
    window.onclick = function(event) {
      if (!event.target.matches('.dropbtn') && !event.target.matches('.user-icon') && !event.target.closest('.dropdown')) {
        const dropdowns = document.querySelectorAll(".dropdown-content");
        dropdowns.forEach(function(dropdown) {
          dropdown.classList.remove('show');
        });
      }
    };
  </script>
</body>
</html>
