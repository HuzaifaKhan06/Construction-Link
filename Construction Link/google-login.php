<?php
require_once 'vendor/autoload.php'; // Load Google Client Library

$client = new Google_Client();
$client->setClientId('17112148994-gn4amga14lt8jlfa1i0esseqifi6512e.apps.googleusercontent.com');
$client->setClientSecret('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');
$client->setRedirectUri('http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/google-callback.php');
$client->addScope(Google_Service_Oauth2::USERINFO_EMAIL);
$client->addScope(Google_Service_Oauth2::USERINFO_PROFILE);

// Redirect to Google's OAuth2 authentication page
$authUrl = $client->createAuthUrl();
header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
exit();
?>