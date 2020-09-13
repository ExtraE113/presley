const MessagingResponse = require('twilio').twiml.MessagingResponse;

exports.handler = async (event) => {
	const twiml = new MessagingResponse();

	if (event.body.Body === 'hello') {
		twiml.message('Hi!');
	} else if (event.body.Body === 'bye') {
		twiml.message('Goodbye');
	} else {
		twiml.message(
			'Reply with a time in the format YYYY-MM-DD hh:mm a to change the alarm to that time on that date.'
		);
	}

	return twiml.toString()
}