<?php

require_once 'vendor/autoload.php'; // Load Google Client Library
require_once 'db.php'; // Database connection file

session_start();

$client = new Google_Client();
$client->setClientId('17112148994-gn4amga14lt8jlfa1i0esseqifi6512e.apps.googleusercontent.com');
$client->setClientSecret('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');
$client->setRedirectUri('http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/google-callback.php');

try {
    if (isset($_GET['code'])) {
        // Attempt to exchange the authorization code for an access token
        $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
        
        // Log the token response for debugging
        error_log(print_r($token, true));

        // Check if there is an error with the token response
        if (isset($token['error'])) {
            throw new Exception("Error fetching access token: " . $token['error_description']);
        }

        // Validate that the token is not null or empty
        if (empty($token)) {
            throw new Exception("Failed to retrieve access token. Response was empty.");
        }

        $client->setAccessToken($token);

        // Verify the access token is valid
        if (!$client->getAccessToken()) {
            throw new Exception("Access token could not be set.");
        }

        // Get user info from Google
        $oauth2 = new Google_Service_Oauth2($client);
        $googleUserData = $oauth2->userinfo->get();

        // Check and log user data
        error_log(print_r($googleUserData, true));

        // User data from Google
        $email = $googleUserData->email;
        $name = $googleUserData->name;

        // Check if user already exists in the database
        $stmt = $pdo->prepare("SELECT * FROM loginWithGoogleusers WHERE email = :email");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        if ($user) {
            // If user exists, log them in
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['email'] = $user['email'];
            header('Location: http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/dashboard.php');
            exit();
        } else {
            // If user doesn't exist, insert into database and log them in
            $stmt = $pdo->prepare("INSERT INTO loginWithGoogleusers (email, name, is_verified) VALUES (:email, :name, 1)");
            $stmt->execute(['email' => $email, 'name' => $name]);

            // Retrieve the newly inserted user ID
            $userId = $pdo->lastInsertId();

            $_SESSION['user_id'] = $userId;
            $_SESSION['email'] = $email;
            header('Location: http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/dashboard.php');
            exit();
        }
    } else {
        throw new Exception("Authorization code not found in the response.");
    }
} catch (GuzzleHttp\Exception\RequestException $e) {
    // Handle Guzzle request errors specifically
    echo "Network error during request: " . $e->getMessage();
} catch (Exception $e) {
    // Handle other general errors
    echo "Error during Google authentication: " . $e->getMessage();
}

exit();
?>
