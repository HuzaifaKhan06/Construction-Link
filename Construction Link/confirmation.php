<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Sent</title>
    
    <link rel="stylesheet" href="css/confirmation.css">
</head>
<body>

    <div class="container">
        <h1>Thank you for signing up!</h1>
        <p>An email has been sent to <span class="email"><?php echo htmlspecialchars($_GET['email']); ?></span>.</p>
        <p>Please check your inbox and click on the verification link to complete the signup process.</p>
        <a href="http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/Login.php" class="btn">Go to Login</a>
    </div>

</body>
</html>