<?php

define("DB_NAME", "") ;
define("DB_USER", "") ;
define("DB_PASS", "") ;
define("DB_DOMAIN", "") ;

$mysqli_object ;    
function db_conn()
{
        $mysqli_object = new mysqli(DB_DOMAIN, DB_USER, DB_PASS, DB_NAME) ;
        if ($mysqli_object->connect_errno) {
                echo "Failed to connect to MySQL: (" . $mysqli_object->connect_errno . ") " . $mysqli_object->connect_error;
        }
        return $mysqli_object ;
}
?>