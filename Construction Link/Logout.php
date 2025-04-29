<?php
session_start();        // grab the session
session_unset();        // wipe out all $_SESSION data
session_destroy();      // kill the session on the server
setcookie(session_name(), '', time() - 3600, '/'); // delete its cookie
header("Location: Login.php");
exit();
?>