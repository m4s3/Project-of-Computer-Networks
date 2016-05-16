var express = require('express');
var path = require('path');
var favicon = require('express-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var debug = require('debug')('app:server');



var books = require('./routes/books'); //vediamo
var users = require('./routes/users'); //vediamo




var app = express();






// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');



app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use('/books', books);
app.use('/users', users);



//function read file//





app.get('/', function(req, res) {
  var options = {
    root: __dirname + "/public/html/",
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };

  var fileName = 'home.html';
  res.sendFile(fileName, options, function(err) {
    if (err) {

      console.log(err);
      res.status(err.status).end();
    }
    else
      console.log('Sent:', fileName);

  });
});




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


var server_port;
var server_ip_address;


  server_port = process.env.PORT || 3000;
  server_ip_address = process.env.IP || "0.0.0.0";


app.listen(server_port, server_ip_address);
