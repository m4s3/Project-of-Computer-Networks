var express = require('express');
var router = express.Router();


router.get('/',function(req,res){
	res.send("stai calmo");
});


module.exports = router;


