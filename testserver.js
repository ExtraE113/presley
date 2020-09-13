const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/sms', (req, res) => {
	const twiml = new MessagingResponse();

	if (req.body.Body === 'hello') {
		twiml.message('Hi!');
	} else if (req.body.Body === 'bye') {
		twiml.message('Goodbye');
	} else {
		twiml.message(
			'Reply with a time in the format YYYY-MM-DD hh:mm a to change the alarm to that time on that date.'
		);
	}

	res.writeHead(200, { 'Content-Type': 'text/xml' });
	res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
	console.log('Express server listening on port 1337');
});
