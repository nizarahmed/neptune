<?php

include_once('basic_model.php') ;

class Model extends BasicModel {
}

$model = new Model ;
echo $model->$_GET["model"]() ;

?>