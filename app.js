var express = require('express');
var bodyParser = require('body-parser');
var got = require('got');
 
var app = express();
var port = process.env.PORT || 1337;
 
// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
 
// test route
app.get('/', function (req, res) { res.status(200).send('Hello world!'); });
 
app.listen(port, function () {
  console.log('Listening on port ' + port);
});

app.post('/hello', function (req, res, next) {
	var userName = req.body.user_name;
	var botPayload = {
	    text : 'Hello ' + userName + ' welcome to Slack at work.'
	  };
	if (userName !== 'slackbot') {
      	return res.status(200).json(botPayload);
    } else {
      	return res.status(200).end();
    }
});

app.post('/git', function (req, res, next) {
  var userName = req.body.user_name;
  console.log('username: ' + userName);
  console.log(req.body);
  var result = '';
  
   var headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic bmthbWJvaDphcG9sbG8xMw==',
      'User-Agent': 'something custom'
    };

  var botPayload = {};

  function getAllPRs() {
  	return got('https://api.github.com/repos/AppDirect/AppDirect/pulls', {
		'headers': headers
	});
	
  }

  var prFileURLList = [];
  var promiseList = [];
  var filesMap = {};

  async function getFilesDiff() {
	prFileURLList.forEach(function(pr) {
		var promise = got('https://api.github.com/repos/AppDirect/AppDirect/pulls/'+pr+'/files', {
				'headers': headers
			}).catch(error => {
			console.log(error.response.body);
			//=> 'Internal server error ...'
		});
		promiseList.push(promise);
	})
  }

  async function run() {
  	try {
	  var response = await getAllPRs();
	  var result = JSON.parse(response.body);
		console.log ('data size:' + result.length);
		result.forEach (function(record) {
			prFileURLList.push(record.number);
			botPayload[record.number] = {
				'pr_id': record.number,
				'title': record.title,
				'developer': record.user.login,
				'diff': record.diff_url,
				'pr': record.html_url

			}
		});
		getFilesDiff();
		try {
			await Promise.all(promiseList);
			promiseList.forEach (function(promise) {
				promise.then(response => {
					if (response && response.body) {
						var fileList = [];
						var changes = JSON.parse(response.body);
						changes.forEach(function(file) {
							fileList.push(file.filename);
						});
						var prPath = response.requestUrl.split( '/' );
						var prId = prPath[prPath.length-2];
						if (botPayload[prId]) {
							botPayload[prId].fileList = fileList;
						} else {
							console.log ('CANNOT FIND PR: ' + prId);
						}
					}
				})
				.catch(error => {
					console.log ('error processing promise for file list: ');
					console.log(error);
					//=> 'Internal server error ...'
				});
			});
		} catch (error) {
			console.log ('error on promise for file list: ');
			console.log(error);
		}
	} catch(error) {
		console.log('error getting prs: ');
		console.log(error);
	}

    // Loop otherwise..
    if (userName !== 'slackbot') {
      	return res.status(200).json(botPayload);
    } else {
      	return res.status(200).end();
    }
  }

  run();
});