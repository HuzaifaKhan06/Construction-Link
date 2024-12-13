<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Dashboard</title>
  <link rel="stylesheet" href="./css/DashBoard.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css" integrity="sha512-5Hs3dF2AEPkpNAR7UiOHba+lRSJNeM2ECkwxUIxC1Q/FLycGTbNapWXB4tP889k5T5Ju8fs4b1P5z/iB4nMfSQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>
  <?php
  session_start();

  if (!isset($_SESSION['user_id'])) {
      header("Location: login.php"); // Redirect to login if not logged in
      exit();
  }

  $user_id = $_SESSION['user_id'];
  $user_name = "";
  $profile_image = "";

  try {
      $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '', [
          PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
      ]);

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
          $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
          $stmt->execute([$user_id]);
          $user_name = $stmt->fetch(PDO::FETCH_ASSOC)['email'];
      }
  } catch (PDOException $e) {
      echo "Error: " . $e->getMessage();
      exit();
  }
  ?>

  <!-- Navigation Bar -->
  <nav class="navbar">
    <div class="logo">Construction Link</div>
    <ul class="nav-links">
      <li><a href="./check.html">Create House Design</a></li>
      <li><a href="#materialEstimation">Estimate Material Costs</a></li>
      <li><a href="#costEstimation">Cost Estimation</a></li>
      <li class="dropdown">
            Switch Profile 
            <div class="dropdown-content">
                <a href="#">Switch to Material Provider</a>
                <a href="#">Switch to Construction Company</a>
            </div>
        </li>
        <li class="dropdown">
    <a href="#" class="user-icon">
      <?php if (!empty($profile_image)): ?>
        <img src="uploads/<?php echo htmlspecialchars($profile_image); ?>" alt="Profile Image" style="width:30px; height:30px; border-radius:50%;">
      <?php else: ?>
        <i class="fa-solid fa-user"></i>
      <?php endif; ?>
    </a>
    <div class="dropdown-content">
        <a href="./EditProfile.php">Edit Profile</a>
        <a href="./Login.php">Logout</a>
    </div>
</li>
    </ul>
  </nav>

  <!-- Carousel Section -->
  <div class="carousel">
    <div class="carousel-images">
      <img src="./imgs/DashboardCarrosal1.webp" alt="House Design 1">
      <img src="./imgs/DashboardCarrosal2.webp" alt="House Design 2">
      <img src="./imgs/DashboardCarrosal3.jpg" alt="House Design 3">
    </div>
    <button class="prev" onclick="moveSlide(-1)">&#10094;</button>
    <button class="next" onclick="moveSlide(1)">&#10095;</button>
  </div>

  <!-- Dashboard Section -->
  <div class="dashboard">
    <h2>Welcome, <?php echo htmlspecialchars($user_name); ?></h2>
    <div class="dashboard-options">
      <div class="option-card" id="createDesign">
        <h3>Create a House Design</h3>
        <p>Design your dream house with our easy-to-use tools.</p>
        <a href="./check.html" class="button">Start Designing</a>
      </div>
      <div class="option-card" id="materialEstimation">
        <h3>Estimate Material Costs</h3>
        <p>Estimate the costs of materials required for your house.</p>
        <a href="#" class="button">Estimate Now</a>
      </div>
      <div class="option-card" id="costEstimation">
        <h3>Select Companies for Cost Estimation</h3>
        <p>Get in touch with companies to estimate total costs.</p>
        <a href="#" class="button">Get Estimates</a>
      </div>
    </div>
  </div>


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
setInterval(() => moveSlide(1), 5000);

// Add JavaScript for handling the dropdown menu if needed
document.querySelector(".dropdown-btn").addEventListener("click", function() {
    document.querySelector(".dropdown-content").classList.toggle("show");
});
  </script>
</body>
</html>
