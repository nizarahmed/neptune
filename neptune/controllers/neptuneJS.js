/*
 *  neptuneJS
 */

var neptune = (function(){
    
    // Attach start to onload event
    // Attach hashchange o onhashchange event
    (function(){
        if( window.addEventListener ) { // W3C standard
            window.addEventListener('load', start, false) ;
            window.addEventListener('hashchange', hashchange, false) ;
        }
        else if( window.attachEvent ) { // Microsoft
            window.attachEvent('onload', start) ;
            window.attachEvent('hashchange', hashchange) ;
        }
    })() ;
    
    // Enable or disable debug mode
    var debug = false ;
    
    // id of div holding main page
    // default 'main-content'
    var page_holder_id = "main-content" ;
    
    // Current visible page
    var current_page ;
    
    // Loaded models, to be used unless forced to be updated from server
    var models = Array() ;
    
    // List of main views waiting its subviews models to be loaded
    var loading_views = Array() ;
    
    // List of views waiting models to be loaded
    var waiting_views = Array() ;
    
    // Navigation type applied on div 'main-content' after change_page
    var navigation_type = "fade" ;
    
    // Flag to prevent simaltanous naviagtions
    var inNavigation = false ;
    
    // Executed after window loaded, to start neptune
    function start() {
        make_cover() ;
        hashchange() ;
    }
    
    // Make a cover for the page_holder_id div
    function make_cover() {
        var main_div = document.getElementById(page_holder_id) ;
        var parent = main_div.parentNode ;
        var cover_div = document.createElement("div") ;
        cover_div.className = "main-content-cover"  ;
        cover_div.id = page_holder_id + "-cover" ;
        parent.insertBefore(cover_div, main_div) ;
        cover_div.appendChild(main_div) ;
    }
    
    // Main usage to handle history back button
    function hashchange() {
        var p = window.location.hash.substring(1, window.location.hash.length) ;
        if( p == current_page ) return ;
        change_page(p) ;
    }
    
    // Navigate to new page
    function change_page(page, user_callback) {
        if( inNavigation ) return ;
        
        current_page = page ;
        window.location = "#" + page ;
        adjust_navigation() ;
        load_view(page, page_holder_id, user_callback) ;
    }
    
    /* Loads a view (html file) into div with id 'div_id'
     * It looks in views/ and append the extension .php
     */
    function load_view(view_name, div_id, user_callback) {
        ajax("views/"+view_name+".php", load_view_callback, "GET", {div_id:div_id, user_callback:user_callback}) ;
    }
    
    /* callback of load_view
     * fill div_id with view_content
     * executes javascript
     */
    function load_view_callback(view_content, param) {
        var div_id = param.div_id ;
        document.getElementById(div_id).innerHTML = view_content ;
        var hold = document.getElementById(div_id).getElementsByTagName("script") ;
        for(var i=0;i<hold.length;i++)
        {
            if ( hold[i].src) {
                document.getElementsByTagName("head")[0].appendChild(hold[i]) ;
            }
            else {
                eval(hold[i].innerHTML) ;
            }
        }
        extract_models_from(div_id, param.user_callback) ;
    }
    
    /* Extracts models from div_id
     * 
     */
    function extract_models_from(div_id, user_callback) {
        var obj = document.getElementById(div_id) ;
        var hold = obj.getElementsByTagName("*") ;
        var views = Array() ;
        
        // Extract models names from view
        for(var i=0;i<hold.length;i++) {
            if( hold[i].getAttribute("nt-data-model") ) {
                views.push(hold[i]) ;
            }
        }
        
        // If no models found, invoke user defined callback
        if( views.length == 0 ) {
            start_navigation() ;
            if( user_callback ) user_callback() ;
        }
        // Add this view to list of loading views to invoke user_callback after view completes loading
        else loading_views.push({
            div_id: div_id,
            models_number: views.length,
            callback: user_callback
        }) ;
        
        // Add subviews (waiting models to be loaded) to list of waiting views
        for(var i=0;i<views.length;i++) {
            var update = views[i].getAttribute("nt-data-model-update") ;
            waiting_views.push({
                view: views[i],
                model: views[i].getAttribute("nt-data-model"),
                main_view: div_id
            }) ;
            get_model(views[i].getAttribute("nt-data-model"), update) ;
        }
    }
    
    /* Loads data model 'model'
     * looks in loaded models first unless force_update is set
     */
    function get_model(model, force_update) {
        force_update = force_update || false ;
        
        for(var i=0;i<models.length;i++) {
            // If model already exists
            if( models[i].name == model ) {
                // Force update the model instead of using the saved one
                if( force_update ) {
                    break ;
                }
                
                // Immediately use the saved model
                else {
                    bind_model_to_views(models[i].name) ;
                    return ;
                }
            }
        }

        ajax("models/model.php?model="+model, get_model_callback, "GET") ;
    }
    
    /* callback of load_model
     * Updates model if it's existing,
     * or adds it, if its a new one
     */
    function get_model_callback(model_content) {
        // Parse json model_content to js object
        var model_obj  ;
        try { model_obj = JSON.parse(model_content) ; } catch (exception) { return ; }
        
        // Update model in saved models with new content
        var i ;
        for(i=0;i<models.length;i++) {
            if (models[i].name == model_obj.model ) {
                models[i].content = model_obj.data ;
                break ;
            }
        }
        
        // Adds the new model to saved models
        if( i == models.length ) {
            models.push({
                name: model_obj.model,
                content: model_obj.data
            }) ;
        }
        
        bind_model_to_views(model_obj.model) ;
    }
    
    
    /* Binds data in model to matching views in waiting_views,
     * and remove matching views from waiting_views
     */
    //TODO, solve this issue: in order to have force_update model, you have to have to force update in ALL matching views
    function bind_model_to_views(model) {
        
        // Get the model from models
        var model_obj ;
        for(var l=0;l<models.length;l++) {
            if( models[l].name == model ) {
                model_obj = models[l].content ;
                break ;
            }
        }
        
        // Bind model to matching views
        for(var i=0;i<waiting_views.length;i++) {
            if( waiting_views[i].model == model ) {
                var div = waiting_views[i].view ;
                var html = div.innerHTML ;
                var repeat = div.hasAttribute("nt-data-row") ? div.getAttribute("nt-data-row") : -1 ;
                var editable = div.hasAttribute("nt-editing-id") ? true : false ;
                var editKey = editable ? div.getAttribute("nt-editing-id") : "" ;
                var images = editable ? div.getAttribute("nt-images") ? div.getAttribute("nt-images").split(",") : null : null ;
                div.innerHTML = "" ;
                
                // To bind variables to required row only, do not repeat
                var j = repeat == -1 ? 0 : repeat ;
                
                // Replace variables names with model data
                for(/*var j=0*/;j<model_obj.length;j++) {
                    var row = html ;
                    var replacement ;
                    var path ;
                    for(var key in model_obj[j]) {
                        // In case of editable add on double click listener
                        if( editable ) {
                            // In case of text
                            replacement = "<span class='nt-edit-field' nt-data-path='" + model + "%" + key + "%" + model_obj[j][editKey] + "%" + editKey + "' ondblclick='javascript:neptune.edit_field(this)'>" + model_obj[j][key] + "</span>" ;
                            
                            // In case of images (path)
                            for(var k=0;images && k<images.length;k++) {
                                if( images[k] == key ) {
                                    replacement = model_obj[j][key] + "\"" + "nt-data-path='" + model + "%" + key + "%" + model_obj[j][editKey] + "%" + editKey + "' ondblclick='javascript:neptune.edit_image(this)'" ;
                                }
                            }
                        }
                        
                        // non-editable, add value only
                        else            replacement = model_obj[j][key] ;
                        row = row.replace("%"+key+"%", replacement) ;
                    }
                    div.innerHTML = div.innerHTML + row ;
                    
                    // Stop repeating if specified row only is required
                    if (repeat != -1) break ;
                }
                
                // If this is the last loaded model in the main view, invoke user defined callcak
                // and, remove main view of wainting_views[i] from loading_views
                for(var j=0;j<loading_views.length;j++) {
                    if( loading_views[j].div_id == waiting_views[i].main_view ) {
                        loading_views[j].models_number -- ;
                        if(loading_views[j].models_number == 0 ) {
                            if( loading_views[j].callback )
                                loading_views[j].callback() ;
                            loading_views.splice(j, 1) ;
                            start_navigation() ;
                            break ;
                        }
                    }
                }

                // Remove waiting_view[i] from waiting_views
                waiting_views.splice(i, 1) ;
                i -- ;
            }
        }
    }
    
    // Change sender to text input for editing
    function edit_field(sender) {
        sender.removeAttribute("ondblclick") ;
        sender.innerHTML = "<textarea style='width:" + (sender.offsetWidth+15) + "px; height:" + (sender.offsetHeight+15) + "px; min-height: 30px' onfocusout='javascript:neptune.save_field(this)'>"+ sender.innerHTML + "</textarea>" ;
        sender.childNodes[0].focus() ;
    }
    
    // Add image input for editing, to change image
    function edit_image(sender) {
        var upload_div = document.getElementById("nt_edit_model") ;
        if( upload_div != null) upload_div.remove() ;
        
        upload_div = document.createElement("DIV") ;
        upload_div.id = "nt_edit_model" ;
        upload_div.style.display = "none" ;
        document.getElementById(page_holder_id).appendChild(upload_div) ;

        var hold = sender.getAttribute("nt-data-path").split("%") ;
        upload_div.setAttribute("nt-data-model-sumbit", "edit_img_"+hold[0]) ;
        
        
        var key = document.createElement("input") ;
        key.setAttribute("name", "key") ;
        key.value = hold[1] ;
        upload_div.appendChild(key) ;
        
        var editkey = document.createElement("input") ;
        editkey.setAttribute("name", "editkey") ;
        editkey.value = hold[2] ;
        upload_div.appendChild(editkey) ;
        
        var image = document.createElement("INPUT") ;
        image.setAttribute("type", "file") ;
        image.name = "image" ;
        image.id = "nt_edit_model_img" ;
        //image.onchange = upload_image ;
        image.onchange = function () {
            sumbit_form("nt_edit_model", upload_image_callback, sender) ;
        }
        upload_div.appendChild(image) ;
        
        image.click() ;
    }
    
    // Save this field
    function save_field(sender) {
        var parent = sender.parentNode ;
        parent.setAttribute("ondblclick", "javascript:neptune.edit_field(this)")
        var hold = parent.getAttribute("nt-data-path").split("%") ;
        
        // Difference between old and new values
        var edited = parent.childNodes[0].innerHTML == sender.value ? false : true ;
        parent.innerHTML = sender.value ;
        
        // Update only if edited
        if( edited ) {
            var data = "key=" + hold[1] + "&editkey=" + hold[2] + "&value=" + sender.value ;
            ajax("models/submit_model.php?model=edit_" + hold[0], save_field_callback, "POST", parent, data) ;
        }
    }
    
    // Save field callback, to save changes in local model
    function save_field_callback(response, sender) {
        update_local_model(sender, "html") ;
    }
    
    // Upload image callback, to update displayed image
    function upload_image_callback(sender) {
        sender.src = "images/"+document.getElementById("nt_edit_model_img").value.split(/(\\|\/)/g).pop() ;
        update_local_model(sender, "src") ;
    }
    
    // Update local model, innerHTML or image src
    function update_local_model(sender, type) {
        var hold = sender.getAttribute("nt-data-path").split("%") ;
        for(var i=0;i<models.length;i++) {
            // model found
            if( models[i].name == hold[0]) {
                for(var j=0;j<models[i].content.length;j++) {
                    // row found
                    if( models[i].content[j][hold[3]] == hold[2] ) {
                        // change field
                        if ( type == "html" )   models[i].content[j][hold[1]] = sender.innerHTML ;
                        else                    models[i].content[j][hold[1]] = sender.getAttribute(type) ;
                    }
                }
            }
        }
    }
    
    // Add main div clone for navigation
    function adjust_navigation() {
        if( navigation_type != "none" ) {
            inNavigation = true ;
            
            var page_org = document.getElementById(page_holder_id) ;
            var page_clone = page_org.cloneNode(true) ;
            
            page_clone.id = page_holder_id + "_clone" ;
            page_clone.style.display = "block" ;
            
            page_org.style.display = "none" ;
            page_org.parentNode.insertBefore(page_clone, page_org) ;
        }
    }
    
    // Start the navigation animation
    function start_navigation() {
        if( navigation_type != "none" ) {
            var page_org = document.getElementById(page_holder_id) ;
            var page_clone = document.getElementById(page_holder_id+"_clone") ;
            var step = 0 ;
            var timer = setInterval(function(){
                step ++ ;
                if( step < 10 ){
                    page_clone.style.opacity = 1- step / 10 ;
                }
                else if( step == 10 ) {
                    page_org.style.display = "block" ;
                    page_org.style.opacity = 0 ;
                    page_clone.parentNode.removeChild(page_clone) ;
                }
                else if( step < 20 ) {
                    page_org.style.opacity = (step-9) / 10 ;
                }
                else {
                    clearInterval(timer) ;
                    inNavigation = false ;
                }
                
            }, 20) ;
        }
    }
    
    /* Submit the data inside div_id
     *
     */
    function sumbit_form(div_id, callback, callback_parameter)
    {
        if ( !validate_form(div_id) ) return ;
        
        var obj = document.getElementById(div_id) ;
        var model = obj.getAttribute("nt-data-model-sumbit") ;
        var obj_clone = obj.cloneNode(true) ;
        obj.parentNode.insertBefore(obj_clone, obj) ;
        
        var ifrm = document.createElement("IFRAME") ;
        document.getElementsByTagName("body")[0].appendChild(ifrm) ;
        
        if( !debug ) {
            ifrm.setAttribute("style", "display: none") ;
        }
        else {
            ifrm.setAttribute("style", "float: left") ;
        }
        
        var idoc = ifrm.contentWindow.document ;
        var form = idoc.createElement("FORM") ;
        form.setAttribute("action", "models/submit_model.php?model="+model) ;
        form.setAttribute("method", "post") ;
        form.setAttribute("enctype", "multipart/form-data") ;
        //form.setAttribute("encoding", "multipart/form-data") ;
        form.appendChild(obj) ;
        idoc.body.appendChild(form) ;
        form.submit() ;
        
        ifrm.onload = function() {
            obj_clone.parentNode.insertBefore(obj, obj_clone) ;
            obj_clone.parentNode.removeChild(obj_clone) ;
            
            if (callback)
                callback(callback_parameter) ;
                //window[callback](document.getElementById("ifrm1").contentWindow.document.getElementsByTagName("body")[0].innerHTML, callback_parameter) ;
            
            if( !debug ) {
                setTimeout(function() {
                    ifrm.parentNode.removeChild(ifrm) ;
                }, 1000) ;
            }
        } ;
    }
    
    function validate_form(div_id) {
        var hold = document.getElementById(div_id).getElementsByTagName("*") ;
        for(var i=0;i<hold.length;i++) {
            
            if( hold[i].tagName == "INPUT" || hold[i].tagName == "SELECT" || hold[i].tagName == "TEXTAREA" ) {
                var val = hold[i].tagName == "TEXTAREA" ? hold[i].innerHTML : hold[i].value ;

                if( hold[i].getAttribute("nt-data-regex") ) {
                    if( !val.match(new RegExp(hold[i].getAttribute("nt-data-regex"))) ) {
                        hold[i].focus() ;
                        return false ;
                    }
                }
            }
        }
        return true ;
    }
    
    /* AJAX request
     *  @path: path of file on server
     *  @callback: function to call after completion of the request
     *  @req_type: 'GET' or 'POST' request, default 'GET'
     *  @parameters: parameters to send with callback
     */
    var ajax = function(path, callback, req_type, parameters, post_data) {
        req_type = req_type || "GET" ;
        var xmlhttp ;
        if( window.XMLHttpRequest ) {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest() ;
        }
        else {// code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP") ;
        }
        xmlhttp.onreadystatechange=function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                callback(xmlhttp.responseText, parameters) ;
            }
        }
        xmlhttp.open(req_type,path,true);
        if (req_type == "GET") xmlhttp.send() ;
        else {
            xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded") ;
            xmlhttp.send(post_data) ;
        }
    }
    
    return {
        change_page: change_page,
        sumbit_form: sumbit_form,
        edit_field:edit_field,
        edit_image:edit_image,
        save_field:save_field,
        load_view: load_view
    } ;
    
})() ;
