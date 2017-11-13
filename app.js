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
	var text = req.body.text;
	var fileName = '';
	if (text) {
		fileName = text.substring(text.indexOf(' ')).trim();
	}

  	var botPayload = {};
	var prFileURLList = [];
	var promiseList = [];

	var headers = {
	  'Content-Type': 'application/json',
	  'Authorization': 'Basic [token_here]',
	  'User-Agent': 'something custom'
	};

	async function getAllPRs() {
		return got('https://api.github.com/repos/AppDirect/AppDirect/pulls', {
			'headers': headers
		});
	}

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
				await Promise.all(promiseList).then(response => {
					response.forEach(function(resp) {
						if (resp && resp.body) {
							var fileList = [];
							var changes = JSON.parse(resp.body);
							changes.forEach(function(file) {
								fileList.push(file.filename);
							});
							var prPath = resp.requestUrl.split( '/' );
							var prId = prPath[prPath.length-2];
							if (botPayload[prId]) {
								botPayload[prId].fileList = fileList;
							} else {
								console.log ('CANNOT FIND PR: ' + prId);
							}
						}
					});
				})
				.catch(error => {
					console.log ('error processing promise for file list: ');
					console.log(error);
					//=> 'Internal server error ...'
				});


				var returnPRs = {};
				var prs = [];
				for (var key in botPayload) {
				    if (botPayload.hasOwnProperty(key)) {
				        var prfiles = botPayload[key].fileList;
				        var containsFile = false;
						if (prfiles) {
							prfiles.forEach(function(file) {
								if (file && file.indexOf(fileName) !== -1) {
									containsFile = true;
								}
							});
						}
						if (containsFile === true) {
							returnPRs[key] = botPayload[key];
							prs.push(botPayload[key].pr);
						}
				    }
				}
				// Loop otherwise..
				var count = prs.length;
				console.log ('pr count: ' + count);
				var prUrls = "";
				if (count > 0) {
					prUrls += 'Found ' + count + ' PRs that touch ' + fileName + ' Here is the list:\n ';
					prs.forEach(function (pr) {
						prUrls += pr + '\n';
					})
				} else {
					prUrls = 'Did not find any PRs that touch ' + fileName;
				}

				console.log ('text: ' + prUrls);
				
				var payLoad = {
				    text :  prUrls
				  };
				if (userName !== 'slackbot') {
				  	return res.status(200).json(payLoad);
				} else {
				  	return res.status(200).end();
				}
			} catch (error) {
				console.log ('error on promise for file list: ');
				console.log(error);
			}
		} catch(error) {
			console.log('error getting prs: ');
			console.log(error);
		}
	}

	run();
});