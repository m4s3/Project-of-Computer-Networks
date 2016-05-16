///modulo per la gestione degli utenti

///inizio variabili globali




//Gestire try catch Json

var express = require('express');
var request = require('request');
var crypto = require('crypto');
var https = require('https');
var multer = require('multer');
var fs = require('fs');

var upload = multer({
	dest: 'public/uploads/'
});

var key=require('../key');



var algorithm = 'aes-256-ctr';
var password =key.password_crypto;















var router = express.Router();


var FIREBASE_URL = "https://turnontrip.firebaseio.com/Users/";
var DEBUG = 1;
var APP_ID_FACEBOOK = key.APP_ID_FACEBOOK;
var APP_SECRET_FB = key.APP_SECRET_FB;
var MY_URL = "https://rdc-project-maseeeeeee-1.c9users.io";

var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(key.FIREBASE_SECRET);
var token = tokenGenerator.createToken({
	uid:key.FIREBASE_UID
});

router.post('/addplaces', upload.any(), function(req, res, next) {


	var decipher_at = crypto.createDecipher(algorithm, password);
	var access_token = decipher_at.update(req.body.ta, 'hex', 'utf8');
	access_token += decipher_at.final('utf8');

	console.log("END\n" + access_token + "\n\n");

	var decipher_ap = crypto.createDecipher(algorithm, password);
	var app_secret = decipher_ap.update(req.body.pa, 'hex', 'utf8');
	app_secret += decipher_ap.final('utf8');

	var city = req.body.new_place;
	console.log(city);

	request.get({
		url: 'https://graph.facebook.com/v2.6/search',
		qs: {
			type: "place",
			q: city,
			access_token:access_token,
			appsecret_proof:app_secret
		}
	}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var parse = JSON.parse(body);
			var id_city = parse.data[0].id;


			var count = 0;
			var id_photos = [];

			for (var index in req.files) {
				fs.rename(req.files[index].path, req.files[index].path + ".jpg");
				var sub_path = (req.files[index].path).substring(6, req.files[index].length);

				request.post({
					url: 'https://graph.facebook.com/v2.6/me/photos',
					qs: {
						access_token: access_token,
						appsecret_proof: app_secret,
						url: MY_URL + sub_path + ".jpg",
						published: false,
						place: id_city
					}
				}, function(error, response, body) {

					if (!error && response.statusCode == 200) {
						count++;
						var parse = JSON.parse(body);
						console.log(parse.id);
						id_photos.push({
							"media_fbid": parse.id
						});

						if (count == req.files.length) {

							request.post({
								url: 'https://graph.facebook.com/v2.6/me/feed',
								qs: {
									attached_media: id_photos,
									place:id_city,
									access_token: access_token,
									appsecret_proof: app_secret,
								}
							}, function(error, response, body) {
								if (!error && response.statusCode == 200) {
									res.send("ok").end();
								}
								else {
									res.send(body).end();
								}
							});
						}
						console.log("Ok");
					}
					else {
						console.log(body);

					}
				});

			}
		}
		else {
			res.send(body).end();
		}
	});
});



////////////////////////////////////////////////

router.post("/luogoCercato", function(req, res, next) {


	var parse = req.body;
	var luogo = parse.place;
	console.log(parse);
	var array_friends = JSON.parse(parse.friend);
	console.log(array_friends.length);


	var result = [];


	var mutex = array_friends.length;



	for (var i in array_friends) {

		var url = FIREBASE_URL + array_friends[i].id + '.json';
		request.get({
				url: url,
				qs: {
					auth: token
				},
				json: true,
				headers: {
					"content-type": "application/json"
				}
			}, function(error, response, body) {

				if (!error && response.statusCode == 200) {

					mutex--;
					var persona = JSON.parse(body);
					var nome = persona.Persona.name;

					var place = persona.Persona.tagged_places;

					for (var l = 0; l < place.length; l++) {


						if (place[l].place.hasOwnProperty("location") && place[l].place.location.hasOwnProperty("city") && place[l].place.location.city.toLowerCase() == luogo.toLowerCase()) {
							result.push(nome);
							break;
						}


					}
					if (!mutex)
						res.json({
							names: result
						}).end();
				}
				else {
					console.log(error);
					res.json({
						name: ''
					});
				}
			}


		);

	}
});

//////////////////////////////////////////////////////






router.post("/data_friends", function(req, res) {
	console.log("prov");
	var id = req.body.id;
	var url = FIREBASE_URL + id + ".json";
	request.get({
		url: url,
		qs: {
			auth: token
		},
		json: true,
		headers: {
			"content-type": "application/json"
		}
	}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var persona = JSON.parse(response.body);
			res.render("home_friend", {
				name: "" + persona.Persona.name,
				email: "" + persona.Persona.email,
				picture: "" + persona.Persona.picture,
				tagged_places: JSON.stringify(persona.Persona.tagged_places),
				photos: JSON.stringify(persona.Persona.photos)
			});
		}
		else
			res.json(response.statusCode, {
				error: error,
				statusCode: response.statusCode
			});
	});

});



///route per redirect su face login

router.get('/login', function(req, res) {

	var verifica_code = JSON.stringify(req.query);

	if (verifica_code.indexOf("code") > -1) {
		var code = req.query.code;
		var url = 'https://graph.facebook.com/v2.6/oauth/access_token';

		///richiesta access_token


		request.get({
			url: url,
			qs: {
				client_id: APP_ID_FACEBOOK,
				redirect_uri: MY_URL + "/users/login",
				client_secret: APP_SECRET_FB,
				code: code
			}
		}, function(error, response, body) {

			if (!error && response.statusCode == 200) {


				var parse = JSON.parse(body);

				var access_token = parse.access_token;
				console.log("START\n" + access_token + "\n\n")
				var appsecret_proof = crypto.createHmac('SHA256', APP_SECRET_FB).update(access_token).digest('hex');

				var cipher_at = crypto.createCipher(algorithm, password);
				var crypted_at = cipher_at.update(access_token, 'utf8', 'hex');
				crypted_at += cipher_at.final('hex');

				var cipher_ap = crypto.createCipher(algorithm, password);
				var crypted_ap = cipher_ap.update(appsecret_proof, 'utf8', 'hex');
				crypted_ap += cipher_ap.final('hex');








				///DDEBUG
				var photos = [];

				request.get({
					url: 'https://graph.facebook.com/v2.6/me/photos',
					qs: {
						fields: "images,place",
						access_token: access_token,
						appsecret_proof: appsecret_proof
					}
				}, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						var array = JSON.parse(body).data;
						for (var i = 0; i < array.length; i++) {
							if (array[i].hasOwnProperty('place')) {
								photos.push(array[i]);
							}
						}
					}
					else {
						res.send("errore photoload :" + response.statusCode).end();
					}
				});

				///richiesta di nome e email dell utente 

				request.get({
					url: "https://graph.facebook.com/v2.5/me",
					qs: {
						fields: "name,email,picture,hometown,location,tagged_places,friends",
						access_token: access_token,
						appsecret_proof: appsecret_proof
					}
				}, function(error, response, body) {

					if (!error && response.statusCode == 200) {

						var parse = JSON.parse(body);
						var picture = parse.picture.data.url;
						var friends = parse.friends.data;
						var tagged_places = parse.tagged_places.data;



						var request_data = {
							Persona: {
								name: parse.name,
								email: parse.email,
								picture: picture,
								tagged_places: tagged_places,
								friends: friends,
								photos: photos

							}
						};


						///inserimento nel db dell'utente

						request.put({
							url: FIREBASE_URL + "/" + parse.id + ".json",
							qs: {
								auth: token
							},
							json: true,
							headers: {
								"content-type": "application/json"
							},
							body: JSON.stringify(request_data)
						}, function(error, response, body) {
							if (!error && response.statusCode == 200) {
								res.render('home', {
									message: parse.name,
									url: picture,
									title: "turnontrip",
									cord: JSON.stringify(tagged_places),
									photos: JSON.stringify(photos),
									friends: JSON.stringify(friends),
									ta: crypted_at,
									pa: crypted_ap
								});
							}
							else {
								res.send("errore post fire :" + response.statusCod + JSON.stringify(body)).end();
							}
						});
					}
					else {
						res.send('errore param face : ' + response.statusCode).end();
					}
				});
			}
			else {
				res.send('errore oauth face:' + response.statusCode).end();
			}
		});
	}
	else {
		res.redirect('https://www.facebook.com/dialog/oauth?client_id=' + APP_ID_FACEBOOK + '&redirect_uri=' + MY_URL + '/users/login&scope=email,user_location,user_hometown,user_tagged_places,user_photos,user_friends,publish_actions');
	}
});



/////////////////////////////////////////////////////////////////////////////////

/*
router.post('/create', function(req, res, next) {
	
//dobbiamo verificare che l'utente non è già registrato o qui o anche con ajax nella form (+ fico)
//farsi restituire l id dal db per creare la home con le viste jade e quindi fare una route parametrica
	
	
  var url='https://api.postmarkapp.com/email';
  var headers={
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': ''
  };
  var body={
      'From': '          ',
      'To': req.body.email,
      'Subject': 'Welcome to Bookstore',
      'Htmlbody':"<html><body><h2>Benvenuto! Hai creato il tuo Account su BookStore, per essere reindirizzato al sito clicca nel LINK sotto </h2> <a href='https://miaopen-massi.rhcloud.com/users/home'> LINK </a></body></html>"
  };
  request.post({
      url:url,
      headers:headers,
      body:JSON.stringify(body)
    },function(error,response,body){
        if (!error && response.statusCode == 200) {
			res.send("<html><head><title>Bookstore</title><link rel='stylesheet' type='text/css' href='../stylesheets/style.css'><meta charset='UTF-8'></head><body>conferma la tua mail per poter accedere<script>setTimeout(function(){ location.assign('https://miaopen-massi.rhcloud.com'); },5000);</script></body></html>");
        }
        else{
            res.send(error.status);
        }
    });
});

router.get('/new',function(req,res){
        var options = {
    root: __dirname + "/../public/html/",
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };

  var fileName = 'form_new_user.html';
  res.sendFile(fileName, options, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    }
    else {
      console.log('Sent:', fileName);
    }
  });
});

router.get('/home',function(req,res){
	res.send(req.hostname);
    /*var options = {
    root: __dirname + "/../public/html/",
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };

  var fileName = 'home_users.html';
  res.sendFile(fileName, options, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    }
    else 
      console.log('Sent:', fileName);
    
  });
});*/

module.exports = router;