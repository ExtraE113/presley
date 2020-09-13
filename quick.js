// const moment = require('moment')
// const got = require('got');
//
// let pushStr = "20200801 0375 20200902 0379 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 00000000 0000 "
// let message = "2020-08-01 06:15"
// let alarmTime = moment(message, "YYYY-MM-DD HH:mm")
//
// let headers = {Authorization: "Bearer 9ca76650d3138262e496ac498e242a4be2c1c782"}
// let options = {
// 	method: 'POST',
// 	form: {args: pushStr},
// 	headers: headers
// }
//
// async function pushNewAlarmTimes(alarmTime, alarmTimesArray) {
//
// 	let headers = {Authorization: "Bearer 9ca76650d3138262e496ac498e242a4be2c1c782"}
// 	let options = {
// 		method: 'POST',
// 		form: {args: pushStr},
// 		headers: headers
// 	}
//
// 	options.url = "https://api.particle.io/v1/devices/280024000c51353432383931/setAlarmTimes"
// 	let response = await got(options)
// 	let rD = JSON.parse(response.body)
// 	if (rD["return_value"] !== 0) {
// 		return {message: 'something went wrong while pushing to photon', success: false}
//
// 	}
//
// 	options.url = "https://api.particle.io/v1/devices/280024000c51353432383931/getAlarmTimes"
// 	options.method = "GET"
// 	options.form = undefined
//
// 	let dblChkResponse = await got(options)
// 	let responseData = JSON.parse(dblChkResponse.body)["result"]
// 	let target = alarmTime.format("YYYYMMDD") + " " + ((alarmTime.hour() * 60) + alarmTime.minute())
// 	console.log(target)
// 	if (!responseData.includes(target)) {
// 		return {message: 'something went wrong, push to photon failed', success: false}
// 	} else {
// 		return {message: 'your alarm has been updated', success: true}
//
// 	}
// }
//
// pushNewAlarmTimes()