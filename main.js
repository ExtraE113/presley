'use strict';

const ical = require('ical')
const MessagingResponse = require('twilio').twiml.MessagingResponse
const moment = require('moment')
const util = require('util')
const AWS = require("aws-sdk")
AWS.config.update({
	region: "us-west-1",
	endpoint: "https://dynamodb.us-west-1.amazonaws.com"
});

const docClient = new AWS.DynamoDB.DocumentClient();


const got = require('got');
const urls = [
	'https://athenian.myschoolapp.com/podium/feed/iCal.aspx?z=BTNiCHKTq%2b7pFq%2bCrIiLW%2bhLFga2MEKwqZeXZ2py4PVDrTY0HxGobzlQbacT6v6MpuZbtkOWKaHEsMZTpAJQtQ%3d%3d',
	'https://p47-caldav.icloud.com/published/2/MTAzOTI4MDI0NjAxMDM5MvBZWkR-aEwesvFyIBuuNLO0E0sqUmtjlXFghkUxZ4Vxw8QF_pPp3h5WZv1MenNW_vU-GlZcSWA1HXJ_nEN0kHo'
]

const headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.5',
	'DNT': '1',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1'
};

const options = {
	headers: headers
};


// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
// DANGER! This is insecure. See http://twil.io/secure
const accountSid = 'AC11d968e9ca5f2eb4da17029fa656a6e2';
const authToken = 'accefb88352951a20e4e15f0f0199ca1';
const client = require('twilio')(accountSid, authToken);

let tomorrow = moment().hour(0).startOf("day").add(moment.duration(1, "days"))
console.log("tomorrow's date: ", tomorrow.format("YYYYMMDD"))
let calUpdates = {}

function handleICSData(data, calUpdatesStarter) {
	function isBefore(candidateStartDate, candidateEndDate, compareTo) {
		let duration = parseInt(candidateEndDate.format("x")) - parseInt(candidateStartDate.format("x"));
		return ((compareTo === undefined || candidateStartDate.isBefore(compareTo)) && moment.duration(duration).asHours() !== 24);
	}


	// Complicated example demonstrating how to handle recurrence rules and exceptions.
	let {firstEventTime, firstEventName = "", overrideTimes = []} = calUpdatesStarter
	for (let k in data) {

		// When dealing with calendar recurrences, you need a range of dates to query against,
		// because otherwise you can get an infinite number of calendar events.
		let rangeStart = tomorrow;
		let rangeEnd = tomorrow.clone().add(moment.duration(1, "day"));


		let event = data[k]
		if (event.type === 'VEVENT') {

			let startDate = moment(event.start);
			let endDate = moment(event.end);

			// Simple case - no recurrences, just print out the calendar event.
			if (typeof event.rrule === 'undefined') {
				if (!(startDate.isAfter(rangeEnd) || endDate.isBefore(rangeStart))) {
					if (isBefore(startDate, endDate, firstEventTime)) {
						firstEventTime = startDate
						firstEventName = event.summary
					}
				}
			}

			// Complicated case - if an RRULE exists, handle multiple recurrences of the event.
			else if (typeof event.rrule !== 'undefined') {
				// For recurring events, get the set of event start dates that fall within the range
				// of dates we're looking for.
				var dates = event.rrule.between(
					rangeStart.toDate(),
					rangeEnd.toDate(),
					true,
					function (date, i) {
						return true;
					}
				)

				// The "dates" array contains the set of dates within our desired date range range that are valid
				// for the recurrence rule.  *However*, it's possible for us to have a specific recurrence that
				// had its date changed from outside the range to inside the range.  One way to handle this is
				// to add *all* recurrence override entries into the set of dates that we check, and then later
				// filter out any recurrences that don't actually belong within our range.
				if (event.recurrences !== undefined) {
					for (let r in event.recurrences) {
						// Only add dates that weren't already in the range we added from the rrule so that
						// we don't double-add those events.
						if (moment(new Date(r)).isBetween(rangeStart, rangeEnd) !== true) {
							dates.push(new Date(r));
						}
					}
				}

				// Loop through the set of date entries to see which recurrences should be printed.
				for (let i in dates) {

					let date = dates[i];
					let curEvent = event;
					let showRecurrence = true;

					startDate = moment(date);

					// Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
					let dateLookupKey = date.toISOString().substring(0, 10);

					// For each date that we're checking, it's possible that there is a recurrence override for that one day.
					if ((curEvent.recurrences !== undefined) && (curEvent.recurrences[dateLookupKey] !== undefined)) {
						// We found an override, so for this recurrence, use a potentially different title, start date, and duration.
						curEvent = curEvent.recurrences[dateLookupKey];
						startDate = moment(curEvent.start);
					}
					// If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
					else if ((curEvent.exdate !== undefined) && (curEvent.exdate[dateLookupKey] !== undefined)) {
						// This date is an exception date, which means we should skip it in the recurrence pattern.
						showRecurrence = false;
					}

					// Set the the title and the end date from either the regular event or the recurrence override.
					var recurrenceTitle = curEvent.summary;

					// If this recurrence ends before the start of the date range, or starts after the end of the date range,
					// don't process it.
					if (endDate.isBefore(rangeStart) || startDate.isAfter(rangeEnd)) {
						showRecurrence = false;
					}

					if (showRecurrence === true) {

						if (isBefore(startDate, endDate, firstEventTime)) {
							firstEventTime = startDate
							firstEventName = recurrenceTitle
						}
					}

				}
			}
		}
	}

	return {
		firstEventTime: firstEventTime,
		firstEventName: firstEventName,
		overrideTimes: overrideTimes
	}

}

function generateText(calUpdates) {

	let isWeekend = tomorrow.weekday() === 6 || tomorrow.weekday() === 0

	let normalFirstEventTime = isWeekend ?
		undefined :
		tomorrow.clone().add(moment.duration(9, 'hours'))

	let out = ""


	if (calUpdates.firstEventTime === undefined) {
		if (normalFirstEventTime === undefined) {
			return ""
		} else {
			// normally we'd have an event (at some point), but today we don't.
			out = `There isn't anything on your schedule. Would you like to cancel your ${normalFirstEventTime.clone().subtract(moment.duration(1, 'hours')).format("hh:mm a")} alarm?`
		}
	} else if (normalFirstEventTime === undefined && calUpdates.firstEventTime.isBefore(tomorrow.clone().add(moment.duration(13, 'hours')))) {
		// we normally wouldn't have an event (likely but not nececarily because its the weekend),
		// but we have an event before 1 pm.
		out = `Alarm isn't set, but "${calUpdates.firstEventName}" is at ${calUpdates.firstEventTime.format('h:mm a')}. ` +
			`Would you like to change your alarm to be at ` +
			`${calUpdates.firstEventTime.subtract(moment.duration(1, "hours")).format("h:mm a")}?`
	} else if (normalFirstEventTime === undefined) {
		// we don't normally have an event.
		// prevents below from firing on weekends or other days when we don't have an event
		// and throwing a npe
	} else if (calUpdates.firstEventTime.isBefore(normalFirstEventTime)) {
		// we have an event before we normally do. move alarm up?
		out = `Alarm is set for 8:00 am, but "${calUpdates.firstEventName}" is at ${calUpdates.firstEventTime.format('h:mm a')}. ` +
			`Would you like to change your alarm to be at ` +
			`${calUpdates.firstEventTime.subtract(moment.duration(1, "hours")).format("h:mm a")}?`
	} else if (calUpdates.firstEventTime.isAfter(normalFirstEventTime)) {
		// our first event is after it normally would be. move alarm later?

		out = `Alarm is set for 8:00 am, but "${calUpdates.firstEventName}", the first thing on your schedule, isn't until ${calUpdates.firstEventTime.format('hh:mm a')}. ` +
			`Would you like to change your alarm to be at ` +
			`${calUpdates.firstEventTime.subtract(moment.duration(1, "hours")).format("h:mm a")}?`
	}

	if (out !== "") {
		out += "\nReply YES or Y for yes, NO or N for no, C to cancel, or with a time in the format hh:mm a to change the alarm to that time."
	}
	return out
}

function sendText(message, recipient) {

	return client.messages
		.create({
			body: message,
			from: '+15754464010',
			to: recipient
		})

}

const putItem = (params) => {
	return new Promise((resolve, reject) => {
		docClient.put(params, (err, data) => {
			if (err) return reject(err)
			resolve(data)
		})
	})
}

const getAll = () => {
	let params = {
		TableName: "alarms",
		ProjectionExpression: "#dt, #tm",
		ExpressionAttributeNames: {
			"#dt": "date",
			"#tm": "time"
		},
	};
	return new Promise((resolve, reject) => {
		docClient.scan(params, (err, data) => {
			if (err) return reject(err)
			resolve(data)
		})
	})
}

exports.handler = async (event) => {
	for (let i = 0; i < urls.length; i++) {
		options.url = urls[i]

		let data = got(options)
		console.log("request started ", i);
		let resolved = await data
		console.log("resolved", resolved)
		if (resolved.statusCode === 200) {
			let data = ical.parseICS(resolved.body)
			calUpdates = handleICSData(data, calUpdates)
			console.log("238")
		}
	}

	let toSend = generateText(calUpdates)
	console.log("sending text ", toSend)
	console.log("cal updates data", calUpdates)
	if (toSend === undefined || toSend === "") {
		return {
			statusCode: 200,
			body: JSON.stringify('No updates'),
		}
	}

	let params = {
		TableName: "alarms",
		Item: {
			"date": calUpdates.firstEventTime.format("YYYY-MM-DD"),
			"time": calUpdates.firstEventTime.format("HH:mm"),
			"confirmed": 0
		}
	};

	// await putItem(params).then(data => console.log(data)).catch(err => console.log(err))
	await sendText(toSend, '+15104997837').then(message => console.log(message.sid));


	return {
		statusCode: 200,
		body: JSON.stringify('Text sent, pending update pushed to db'),
	}
}


async function pushNewAlarmTimes(alarmTime, alarmTimesArray) {
	let pushStr = ""
	for (let i = 0; i <= 30; i++) {
		if (alarmTimesArray[i] === undefined) {
			pushStr += "00000000 0000 "
		} else {
			pushStr += (alarmTimesArray[i].format("YYYYMMDD") + " ") + (('0000' + ((alarmTimesArray[i].hour() * 60) + alarmTimesArray[i].minute())).slice(-4)) + " "
		}
	}

	console.log("pushing ", pushStr)

	let headers = {Authorization: "Bearer 9ca76650d3138262e496ac498e242a4be2c1c782"}
	let options = {
		method: 'POST',
		form: {args: pushStr},
		headers: headers
	}

	options.url = "https://api.particle.io/v1/devices/280024000c51353432383931/setAlarmTimes"
	let response = await got(options)
	let rD = JSON.parse(response.body)
	if (rD["return_value"] !== 0) {
		return {message: 'something went wrong while pushing to photon', success: false}

	}

	options.url = "https://api.particle.io/v1/devices/280024000c51353432383931/getAlarmTimes"
	options.method = "GET"
	options.form = undefined

	let dblChkResponse = await got(options)
	let responseData = JSON.parse(dblChkResponse.body)["result"]
	let target = alarmTime.format("YYYYMMDD") + " " + ((alarmTime.hour() * 60) + alarmTime.minute())
	console.log(target)
	if (!responseData.includes(target)) {
		return {message: 'something went wrong, push to photon failed ' + responseData + " but expected " + target, success: false}
	} else {
		return {message: 'your alarm has been updated', success: true}

	}
}

exports.incomingSMS = async (event) => {
	console.log(event.body)
	const urlParams = new URLSearchParams(event.body);
	let message = decodeURIComponent(urlParams.get("Body"))
	let out = ""
	message = message.toLowerCase()
	if (message === "yes" || message === "y") {
		console.log("yes fork")
		out = "affirmative conformations are not yet supported"
	} else if (message === "no" || message === "n") {
		console.log("no fork")
		out = "negative conformations are not yet supported"
	}
		// else if(moment(message, "HH:mm").format() !== "Invalid date") {
		// 	console.log("283", moment(message, "HH:mm"))
		// 	out = "times without dates are not yet supported"
	// }
	else if (moment(message, "YYYY-MM-DD HH:mm").isValid()) {
		let alarmTime = moment(message, "YYYY-MM-DD HH:mm")
		if(alarmTime.isBefore(moment.now() - moment.duration(2, "days"))){
			return {
				statusCode: 200,
				headers: {"content-type": "text/plain"},
				body: "Setting times for past alarms is not supported.",
			}
		}
		console.log(alarmTime)

		let params = {
			TableName: "alarms",
			Item: {
				"date": alarmTime.format("YYYY-MM-DD"),
				"time": alarmTime.format("HH:mm"),
				"confirmed": 1
			}
		};

		await putItem(params).then(data => console.log(data)).catch(err => console.log(err))


		let data = await getAll()

		let momArray = []

		console.log(data)
		for (let i in data.Items) {
			let mom = moment(data.Items[i].date + "T" + data.Items[i].time, "YYYY-MM-DDTHH:mm")
			momArray.push(mom)
		}
		console.log("331 ", momArray)
		momArray = momArray.filter((value =>
				value.isAfter(moment.now() - moment.duration(2, "days"))
		)).sort()
		console.log("332 ", momArray)
		momArray = momArray.slice(0, 31)
		console.log("336 ", momArray)

		let pushTimesResult = await pushNewAlarmTimes(alarmTime, momArray)
		console.log(pushTimesResult)
		out = pushTimesResult.message

	} else {
		console.log(message)
		out = 'Reply with a time in the format YYYY-MM-DD HH:mm to change the alarm to that time on that date.'
	}

	return {
		statusCode: 200,
		headers: {"content-type": "text/xml"},
		body: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
			"<Response>\n" +
			`    <Message><Body>${out}</Body></Message>\n` +
			"</Response>",
	}
}