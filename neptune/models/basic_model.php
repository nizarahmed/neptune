<?php

class BasicModel {
    
    protected $mysql ;
    
    function BasicModel() {
        
        if( isset($_GET["model"]) && $_GET["model"] != "" ) {
            include_once('../conf.php') ;
            
            $this->mysql = new mysqli(DB_DOMAIN, DB_USER, DB_PASS, DB_NAME) ;
            if( $this->mysql->connect_errno ) {
                $this->report_error($this->mysql->connect_errno . " - " . $this->mysql->connect_error) ;
                exit ;
            }
        }
    }
    
    function package($res) {
        $rows = array() ;
        while( $row = $res->fetch_object() ) $rows[] = $row ;
        $json_ret = '{"model":"' . $_GET[model] . '", "data":' . json_encode($rows) . '}' ;
        return $json_ret ;
    }
    
    function report_error($messgae) {
        echo $messgae ;
    }
}

?>