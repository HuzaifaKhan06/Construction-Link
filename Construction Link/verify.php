<?php
if (isset($_GET['code'])) {
    $verification_code = $_GET['code'];

    try {
        $pdo = new PDO('mysql:host=localhost;dbname=constructionlink', 'root', '');

        $stmt = $pdo->prepare("SELECT * FROM users WHERE verification_code = ?");
        $stmt->execute([$verification_code]);

        if ($stmt->rowCount() > 0) {
            // Update the user's verification status
            $stmt = $pdo->prepare("UPDATE users SET is_verified = TRUE WHERE verification_code = ?");
            $stmt->execute([$verification_code]);

            // Redirect to a success page
            header("Location: verified.html?email=success");
            exit;
        } else {
            // Redirect to an error page if the code is invalid
            header("Location: verified.html?email=error");
            exit;
        }
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage();
    }
} else {
    // Redirect to the error page if no code is provided
    header("Location: verified.html?email=error");
    exit;
}