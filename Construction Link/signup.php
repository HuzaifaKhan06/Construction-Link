<?php
// Include the PHPMailer library
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    // Check if passwords match
    if ($password !== $confirm_password) {
        echo "<script>alert('Passwords do not match.'); window.history.back();</script>";
        exit;
    }

    // Hash the password using BCRYPT
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // Generate a unique verification code
    $verification_code = md5(uniqid(mt_rand(), true));

    try {
        // Connect to the database
        $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');

        // Check if the email already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetchColumn() > 0) {
            echo "<script>alert('Email already exists.'); window.history.back();</script>";
            exit;
        }

        // Insert the user's email, hashed password, and verification code into the database
        $stmt = $pdo->prepare("INSERT INTO users (email, password, verification_code) VALUES (?, ?, ?)");
        $stmt->execute([$email, $hashed_password, $verification_code]);

        // Set up PHPMailer
        $mail = new PHPMailer(true);

        try {
            // SMTP configuration
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'fixingbugsbyh@gmail.com'; // Your Gmail address
            $mail->Password = 'cqed rqsy veiw mpxf'; // Your Gmail App Password
            $mail->SMTPSecure = 'tls'; // Use TLS encryption
            $mail->Port = 587;

            // Enable SMTP debugging for development (only use this in development, not production)
            $mail->SMTPDebug = 0; // Set to 0 to disable debug output (use 2 to enable)
            $mail->Debugoutput = 'html'; // Show debug output in HTML format

            // Email settings
            $mail->setFrom('fixingbugsbyh@gmail.com', 'Construction Link');
            $mail->addAddress($email); // Add the user's email as the recipient
            $mail->isHTML(true); // Set email format to HTML

            // Email subject and body
            $mail->Subject = 'Verify Your Email Address';
            $mail->Body    = "Click the link to verify your email: <a href='http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/verify.php?code=$verification_code'>Verify Email</a>";

            // Send the email
            $mail->send();

            // Redirect to the confirmation page
            header("Location: confirmation.php?email=" . urlencode($email));
            exit;

        } catch (Exception $e) {
            // Show error message if email sending fails
            echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        }

    } catch (PDOException $e) {
        // Show error message if database operation fails
        echo "Error: " . $e->getMessage();
    }
}
?>