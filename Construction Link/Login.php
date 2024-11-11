<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $password = $_POST['password'];

    try {
        // Connect to the database
        $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');

        // Prepare and execute the query
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            if (password_verify($password, $user['password'])) {
                if ($user['is_verified']) {
                    // User is verified, grant access
                    $_SESSION['user_id'] = $user['id'];
                    header("Location: http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/dashboard.php");
                    exit;
                } else {
                    echo "<script>alert('Email not verified. Please check your inbox.');</script>";
                }
            } else {
                echo "<script>alert('Invalid credentials.');</script>";
            }
        } else {
            echo "<script>alert('Invalid credentials.');</script>";
        }
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Page</title>
    <link rel="stylesheet" href="css/Login.css">
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <img src="imgs/Logo.jpg" alt="University Logo" class="logo">
            <h1>Construction Link</h1>
            <h3>Login To Your Account</h3>
            <form action="" method="POST">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
                
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                
                <div class="options">
                    <label for="remember-me">
                        <input type="checkbox" id="remember-me" name="remember-me">
                        Remember Me
                    </label>
                    <a href="forgot_password.php" class="forgot-password">Forgot Password?</a>
                </div>

                <button type="submit">Login</button>
                <button type="button" class="google-login" onclick="window.location.href='http://localhost:3000/auth/google'">
                    <img src="imgs/Google_logo-transformed.webp" alt="Google Logo" class="google-logo">
                    Login with Google
                </button>
                
                <p id="error-message" class="error-message" style="display: none;">Wrong username or password</p>
                <p class="signup-text">Don't have an account? <a href="Signup.html">Sign up</a></p>
            </form>
        </div>
    </div>
</body>
</html>