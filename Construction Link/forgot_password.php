<?php
require 'vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];

    try {
        $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $token = md5(uniqid(mt_rand(), true));
            $expiry = gmdate("Y-m-d H:i:s", time() + 3600); // 1 hour in the future

            $stmt = $pdo->prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?");
            $stmt->execute([$token, $expiry, $email]);

            // Set up PHPMailer
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'fixingbugsbyh@gmail.com';
            $mail->Password = 'cqed rqsy veiw mpxf'; // Update with your email password
            $mail->SMTPSecure = 'tls';
            $mail->Port = 587;

            $mail->setFrom('fixingbugsbyh@gmail.com', 'Construction Link');
            $mail->addAddress($email);
            $mail->isHTML(true);

            $resetLink = "http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/reset_password.php?token=$token";
            $mail->Subject = 'Password Reset Request';
            $mail->Body = "Click the link to reset your password: <a href='$resetLink'>Reset Password</a>";

            $mail->send();
            echo "<script>alert('Password reset link sent to your email.'); window.location.href = 'Login.php';</script>";
        } else {
            echo "<script>alert('Email not found.'); window.history.back();</script>";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password</title>
     <link rel="stylesheet" href="css/main.css"> 
    <link rel="stylesheet" href="css/forgetPassword.css">
</head>
<body>
    <div class="container">
        <div class="form-box forgot-password-box">
            <h2>Forgot Password</h2>
            <form action="forgot_password.php" method="POST">
                <div class="input-group">
                    <input type="email" name="email" required>
                    <label>Email</label>
                </div>
                <button type="submit" class="btn primary-btn gtcod">Get Code</button>
            </form>
        </div>
    </div>
</body>
</html>
