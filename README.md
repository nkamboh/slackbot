# slackbot with GIT

create a slack bot using http://devdactic.com/first-slackbot/

create a horoku account and push the code to horoku
git init
git add .
git commit -m 'Initial commit.'
heroku create
git push heroku master

once the server is up and running, configure slack to use an outgoing webhook
refer to this video for a tutorial
https://www.youtube.com/watch?v=BWaTYiTbv7Q

other helpful commands:
tail the log from heroku
heroku logs -t
