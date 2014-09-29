<?php

include_once('basic_model.php') ;

class SubmitModel extends BasicModel {
}

$submit_model = new SubmitModel ;
echo $submit_model->$_GET["model"]() ;

?>