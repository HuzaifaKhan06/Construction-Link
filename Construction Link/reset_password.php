<?php
if (isset($_GET['token'])) {
    $token = $_GET['token'];

    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $new_password = $_POST['password'];
        $confirm_password = $_POST['confirm_password'];

        if ($new_password != $confirm_password) {
            echo "<script>alert('Passwords do not match.'); window.history.back();</script>";
        } else {
            $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);

            try {
                $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                // Check if the token is valid and not expired
                $stmt = $pdo->prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > UTC_TIMESTAMP()");
                $stmt->execute([$token]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($user) {
                    // Update password and clear token
                    $stmt = $pdo->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?");
                    $stmt->execute([$hashed_password, $token]);

                    echo "<script>alert('Password changed successfully!'); window.location.href = 'Login.php';</script>";
                } else {
                    // Token is invalid or expired
                    echo "<script>alert('Invalid or expired token.'); window.history.back();</script>";
                }
            } catch (PDOException $e) {
                echo "<script>alert('An error occurred: " . $e->getMessage() . "');</script>";
            }
        }
    }
} else {
    header("Location: Login.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/reset_password.css">
</head>
<body>
    <div class="container">
        <div class="form-box reset-password-box">
            <h2>Reset Password</h2>
            <form action="" method="POST">
                <div class="input-group">
                    <input type="password" name="password" required>
                    <label>New Password</label>
                </div>
                <div class="input-group">
                    <input type="password" name="confirm_password" required>
                    <label>Confirm Password</label>
                </div>
                <button type="submit" class="btn primary-btn">Reset Password</button>
            </form>
        </div>
    </div>
</body>
</html>
