var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs')

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });

  var filePath = path.join(__dirname, '../public/issues.html')
  if (fs.existsSync(filePath))
    {
        res.sendfile(filePath);
    }
    else
    {
       res.statusCode = 404;
       res.write('404 sorry not found');
       res.end();
    }
});

module.exports = router;
