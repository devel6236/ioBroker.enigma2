/* jshint -W097 */// jshint strict:false
/*jslint node: true */
/* enigma2 Adapter V 1.2.9 */
'use strict';

const request = require('request');
const net = require('net');
const http = require('http');
const querystring = require('querystring');
const xml2js = require('xml2js');

// you have to require the utils module and call adapter function
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils

const adapter = utils.adapter('enigma2');

var isConnected = null;
var deviceId = 1;

//Polling
var event_interval;

var PATH = {
	MESSAGEANSWER: '/web/messageanswer?getanswer=now',
	DEVICEINFO: '/web/deviceinfo',
	REMOTE_CONTROL: '/web/remotecontrol?command=',
	VOLUME: '/web/vol',
	VOLUME_SET: '/web/vol?set=set',
	GET_CURRENT: '/web/getcurrent',
	POWERSTATE: '/web/powerstate',
	MESSAGE: '/web/message?text=',
	DELETE: '/web/timerdelete?sRef=',
	TIMER_TOGGLE: '/api/timertogglestatus?sRef=',
	TIMERLIST: '/web/timerlist',
	MAIN_COMMAND: '/web/powerstate?newstate=',
	ZAP: '/web/zap?sRef=',
	ISRECORD: '/web/timerlist',
	API: '/api/statusinfo',
	GETLOCATIONS: '/web/getlocations',
	GETALLSERVICES: '/web/getallservices'
};

var commands = {
	CHANNEL_DOWN: 403,
	CHANNEL_UP: 402,
	DOWN: 108,
	EPG: 358,
	EXIT: 174,
	LEFT: 105,
	MENU: 139,
	MUTE_TOGGLE: 113,
	OK: 352,
	PLAY_PAUSE: 164,
	RADIO: 385,
	REC: 167,
	RIGHT: 106,
	STANDBY_TOGGLE: 116,
	STOP: 128,
	TV: 377,
	UP: 103
};

var main_commands = {
	DEEP_STANDBY: 1,
	REBOOT: 2,
	RESTART_GUI: 3,
	WAKEUP_FROM_STANDBY: 4,
	STANDBY: 5
};

//Polling
adapter.on("unload", function (callback) {
	try {
		if (event_interval) {
			clearInterval(event_interval);
		}
	} catch (e) {
		callback();
	}
});

adapter.on('message', function (obj) {
	if (obj !== null && obj !== undefined) {
		adapter.setState('Message.Timeout', { val: parseFloat(JSON.stringify(obj.message.timeout).replace(/"/g, '')), ack: true });
		adapter.setState('Message.Type', { val: parseFloat(JSON.stringify(obj.message.msgType).replace(/"/g, '')), ack: true });
		adapter.setState('Message.Text', { val: JSON.stringify(obj.message.message).replace(/"/g, ''), ack: false });
	}
});

adapter.on('stateChange', function (id, state) {
	if (id && state && !state.ack) {
		var parts = id.split('.');
		var name = parts.pop();

		if (id === adapter.namespace + '.Message.Type') {
			adapter.setState('Message.Type', { val: state.val, ack: true });
		} else
			if (id === adapter.namespace + '.Message.Timeout') {
				adapter.setState('Message.Timeout', { val: state.val, ack: true });
			}

		if (commands[name]) {
			getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + commands[name] + '&rcu=advanced', function (error, command, deviceId, xml) {
				if (error) {
					//adapter.log.error('Cannot send command "' + name + '": ' + error);
				}
			});
		} else
			if (main_commands[name]) {
				getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + main_commands[name], function (error, command, deviceId, xml) {
					if (error) {
						//adapter.log.error('Cannot send command "' + name + '": ' + error);
					}
				});
			} else
				if (id === adapter.namespace + '.Timer.Update') {
					getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
				} else
					//+++++++++++++++++++++++++++
					if (id === adapter.namespace + '.Alexa_Command.Standby') {
						adapter.getState('Alexa_Command.Standby', function (err, state) {
							if (state.val === true) {
								getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + '4', function (error, command, deviceId, xml) {
									if (error) {
										//adapter.log.error('Cannot send command "' + name + '": ' + error);
										adapter.setState('Alexa_Command.Standby', { val: state.val, ack: true });
									}
								});
							} else
								if (state.val === false) {
									getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + '5', function (error, command, deviceId, xml) {
										if (error) {
											//adapter.log.error('Cannot send command "' + name + '": ' + error);
											adapter.setState('Alexa_Command.Standby', { val: state.val, ack: true });
										}
									});
								}
						});
					} else
						if (id === adapter.namespace + '.Alexa_Command.Mute') {
							adapter.getState('Alexa_Command.Mute', function (err, state) {
								if (state.val === true) {
									getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + '113', function (error, command, deviceId, xml) {
										if (error) {
											//adapter.log.error('Cannot send command "' + name + '": ' + error);
											adapter.setState('Alexa_Command.Mute', { val: state.val, ack: true });
										}
									});
								} else
									if (state.val === false) {
										getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + '113', function (error, command, deviceId, xml) {
											if (error) {
												//adapter.log.error('Cannot send command "' + name + '": ' + error);
												adapter.setState('Alexa_Command.Mute', { val: state.val, ack: true });
											}
										});
									}
							});
						} else
							//enigma2.Update
							if (id === adapter.namespace + '.enigma2.Update') {
								getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
								getResponse('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER'], evaluateCommandResponse);
								getResponse('GETCURRENT', deviceId, PATH['GET_CURRENT'], evaluateCommandResponse);
								getResponse('ISRECORD', deviceId, PATH['ISRECORD'], ISRECORD);
								getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], evaluateCommandResponse);
								getResponse('DEVICEINFO_HDD', deviceId, PATH['DEVICEINFO'], evaluateCommandResponse);
								getResponse('GETMOVIELIST', deviceId, PATH['GETLOCATIONS'], evaluateCommandResponse);
								adapter.setState('enigma2.Update', { val: state.val, ack: true });
							} else
								if (id === adapter.namespace + '.enigma2.STANDBY') {
									getResponse('NONE', deviceId, PATH['MAIN_COMMAND'] + 0, function (error, command, deviceId, xml) {
										if (!error) {
											adapter.setState('enigma2.STANDBY', state.val, true);
											getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
										} else {
											adapter.setState('enigma2.STANDBY', { val: state.val, ack: true });
											getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
										}
									});
								} else if (id === adapter.namespace + '.command.SET_VOLUME') {
									getResponse('NONE', deviceId, PATH['VOLUME_SET'] + parseInt(state.val, /*10*/), function (error, command, deviceId, xml) {
										if (!error) {
											adapter.setState('command.SET_VOLUME', { val: state.val, ack: false });
										} else {
											adapter.setState('command.SET_VOLUME', { val: '', ack: true });
										}
									});
								} else if (id === adapter.namespace + '.command.REMOTE-CONTROL') {
									getResponse('NONE', deviceId, PATH['REMOTE_CONTROL'] + state.val + '&rcu=advanced', function (error, command, deviceId, xml) {
										if (!error) {
											adapter.setState('command.REMOTE-CONTROL', state.val, true);
										} else {
											adapter.setState('command.REMOTE-CONTROL', { val: state.val, ack: true });
										}
									});
								} else if (id === adapter.namespace + '.Message.Text') {
									var MESSAGE_TEXT = state.val;

									adapter.getState('Message.Type', function (err, state) {
										var MESSAGE_TYPE = state.val;

										adapter.getState('Message.Timeout', function (err, state) {
											var MESSAGE_TIMEOUT = state.val;

											getResponse('NONE', deviceId, PATH['MESSAGE'] + encodeURIComponent(MESSAGE_TEXT) + '&type=' + MESSAGE_TYPE + '&timeout=' + MESSAGE_TIMEOUT, function (error, command, deviceId, xml) {
												if (!error) {
													adapter.setState('Message.Text', MESSAGE_TEXT, true);
												} else {
													adapter.setState('Message.Text', { val: MESSAGE_TEXT, ack: true });
												}
											});
										});
									});
									//ZAP
								} else if (id === adapter.namespace + '.command.ZAP') {
									//var MESSAGE_TEXT  = state.val;
									getResponse('NONE', deviceId, PATH['ZAP'] + state.val, function (error, command, deviceId, xml) {
										if (!error) {
											adapter.setState('command.ZAP', state.val, true);
										} else {
											adapter.setState('command.ZAP', { val: state.val, ack: true });
										}
									});
									//Timer
								} else if (parts[1] === 'Timer' && name === 'Timer_Toggle') {
									var timerID = parts[2];

									adapter.getState('Timer.' + timerID + '.Timer_servicereference', function (err, state) {
										var T_sRef = state.val;
										adapter.getState('Timer.' + timerID + '.Timer_Start', function (err, state) {
											var T_begin = state.val;
											adapter.getState('Timer.' + timerID + '.Timer_End', function (err, state) {
												var T_end = state.val;
												getResponse('NONE', deviceId, PATH['TIMER_TOGGLE'] + T_sRef + '&begin=' + T_begin + '&end=' + T_end, function (error, command, deviceId, xml) {
													if (!error) {
														adapter.setState('Timer.' + timerID + '.Timer_Toggle', state.val, true);
													} else {
														getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
													}
												});
											});
										});
									});
								} else if (parts[1] === 'Timer' && name === 'Delete') {
									var timerID = parts[2];

									adapter.getState('Timer.' + timerID + '.Timer_servicereference', function (err, state) {
										var T_sRef = state.val;
										adapter.getState('Timer.' + timerID + '.Timer_Start', function (err, state) {
											var T_begin = state.val;
											adapter.getState('Timer.' + timerID + '.Timer_End', function (err, state) {
												var T_end = state.val;
												getResponse('NONE', deviceId, PATH['DELETE'] + T_sRef + '&begin=' + T_begin + '&end=' + T_end, function (error, command, deviceId, xml) {
													if (!error) {
														adapter.setState('Timer.' + timerID + '.Delete', state.val, true);
													} else {
														adapter.setState('Timer.' + timerID + '.Delete', { val: state.val, ack: true });
														getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], TimerSearch);
													}
												});
											});
										});
									});
								};
	}

});

adapter.on('ready', function () {
	main();
	main2();
});

async function getResponseAsync(deviceId, path) {
	let command = 'NONE';

	return new Promise((resolve, reject) => {
		getResponse(command, deviceId, path, function (command, deviceId, xml) {
			resolve(xml);
		});
	});
}

function getResponse(command, deviceId, path, callback) {
	// var device = dreamSettings.boxes[deviceId];
	var options = {
		host: adapter.config.IPAddress,
		port: adapter.config.Port,
		TimerCheck: adapter.config.TimerCheck,
		Webinterface: adapter.config.Webinterface,
		movieliste: adapter.config.movieliste,
		timerliste: adapter.config.timerliste,
		path: path,
		alexa: adapter.config.Alexa,
		method: 'GET'
	};

	if (typeof adapter.config.Username != 'undefined' && typeof adapter.config.Password != 'undefined') {
		if (adapter.config.Username.length > 0 && adapter.config.Password.length > 0) {
			options.headers = {
				'Authorization': 'Basic ' + new Buffer(adapter.config.Username + ':' + adapter.config.Password).toString('base64')
			}
		} else {
			adapter.log.debug("using no authorization");
		}
	}

	var req = http.get(options, function (res) {
		const { statusCode } = res;
		var pageData = "";

		if (command === 'PICON') {
			res.setEncoding('base64');

			var pageData = "data:" + res.headers["content-type"] + ";base64,";
		}
		else {
			res.setEncoding('utf8');

			if (statusCode == 200) {
				setStatus(true);
			}
		}

		res.on('data', function (chunk) {
			pageData += chunk
		});
		res.on('end', function () {
			if (command !== 'PICON') {
				if (path.includes('/api/')) {
					// using JSON API
					try {
						let parser = JSON.parse(pageData);
						if (callback) {
							callback(command, 1, parser);
						}
					} catch (err) {
						adapter.log.error(`[getResponse] error: ${err.message}`);
						adapter.log.error("[getResponse] stack: " + err.stack);

						if (callback) {
							callback(command, 1, null);
						}
					}
				} else {
					// using XML API
					var parser = new xml2js.Parser();
					parser.parseString(pageData, function (err, result) {
						if (callback) {
							callback(command, 1, result);
						}
					});
				}
			}
			else {
				if (callback) {
					callback(command, (statusCode == '200' && pageData.length > 0 ? true : false), pageData);
				}
			}
		});
	});
	req.on('error', function (e) {
		setStatus(false);
		//adapter.setState('enigma2.isRecording', false, true);
		return;
	});
}

function parseBool(string) {
	var cleanedString = string[0].replace(/(\r|\t\n|\n|\t)/gm, "");
	switch (cleanedString.toLowerCase()) {
		case "true": case "yes": case "1": return true;
		default: return false;
	}
}

function sec2HMS(sec) {
	if (sec === 0) {
		return '0';
	}

	const sec_num = parseInt(sec, 10);
	let hours = Math.floor(sec_num / 3600);
	let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	let seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (minutes < 10) { minutes = '0' + minutes; }
	if (seconds < 10) { seconds = '0' + seconds; }
	if (hours === 0) {
		return minutes + ':' + seconds;
	}

	if (hours < 10) { hours = '0' + hours; }
	return hours + ':' + minutes + ':' + seconds;
}

async function evaluateCommandResponse(command, deviceId, xml) {
	var bool;

	switch (command.toUpperCase()) {
		case "MESSAGE":
		case "MESSAGETEXT":
		case "MESSAGEANSWER":
			adapter.setState('enigma2.MESSAGE_ANSWER', { val: xml.e2simplexmlresult.e2statetext[0], ack: true });
			break;
		case "RESTART":
		case "REBOOT":
		case "DEEPSTANDBY":
			break;
		case "MUTE":
		case "UNMUTE":
		case "MUTE_TOGGLE":
		case "VOLUME":
		case "SET_VOLUME":
			adapter.setState('enigma2.COMMAND', { val: '', ack: true });
			break;
		case "WAKEUP":
		case "STANDBY":
		case "OFF":
		case 'STANDBY_TOGGLE':
			break;
		case "GETSTANDBY":
			adapter.setState('enigma2.STANDBY', { val: parseBool(xml.e2powerstate.e2instandby), ack: true });
			if (adapter.config.Webinterface === "true" && parseBool(xml.e2powerstate.e2instandby) === true) {
				adapter.setState('enigma2.CHANNEL_PICON', { val: '', ack: true });
				adapter.setState('enigma2.CHANNEL_PICON64', { val: '', ack: true });
			}
			//Alexa_Command.Standby
			if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true) {
				var alexastby = parseBool(xml.e2powerstate.e2instandby);
				if (alexastby === false || alexastby === "false") {
					adapter.setState('Alexa_Command.Standby', { val: true, ack: true });
				} else if (alexastby === true || alexastby === "true") {
					adapter.setState('Alexa_Command.Standby', { val: false, ack: true });
				}
			}
			break;
		case "GETVOLUME":
			if (!xml.e2volume || !xml.e2volume.e2current) {
				adapter.log.error('No e2volume found');
				return;
			}
			bool = parseBool(xml.e2volume.e2ismuted);
			adapter.setState('enigma2.VOLUME', { val: parseInt(xml.e2volume.e2current[0]), ack: true });
			adapter.setState('enigma2.MUTED', { val: parseBool(xml.e2volume.e2ismuted), ack: true });
			//Alexa_Command.Mute
			if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true) {
				var alexaMute = parseBool(xml.e2volume.e2ismuted);
				if (alexaMute === false || alexaMute === "false") {
					adapter.setState('Alexa_Command.Mute', { val: true, ack: true });
				} else if (alexaMute === true || alexaMute === "true") {
					adapter.setState('Alexa_Command.Mute', { val: false, ack: true });
				}
			}
			break;
		case "GETCURRENT":
			if (xml.e2currentserviceinformation.e2eventlist[0] !== undefined) {
				
				var e2EVENTDURATION_X = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventduration[0]);
				var e2EVENTDURATION = sec2HMS(parseFloat(e2EVENTDURATION_X));
				
				adapter.setState('enigma2.EVENTDURATION_MIN', { val: Math.round(e2EVENTDURATION_X / 60), ack: true });

				if (e2EVENTDURATION === 'NaN:NaN:NaN' || e2EVENTDURATION === '0') {
					adapter.setState('enigma2.EVENTDURATION', { val: ''/*'0:0:0'*/, ack: true });
				} else {
					adapter.setState('enigma2.EVENTDURATION', { val: e2EVENTDURATION, ack: true });
				};

				//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

				adapter.setState('enigma2.PROGRAMM', { val: (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventname[0]).replace('N/A', ''), ack: true });

				adapter.setState('enigma2.PROGRAMM_AFTER', { val: (xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventname[0]).replace('N/A', ''), ack: true });

				adapter.setState('enigma2.PROGRAMM_INFO', { val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescriptionextended[0], ack: true });

				adapter.setState('enigma2.PROGRAMM_AFTER_INFO', { val: xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventdescriptionextended[0], ack: true });

				adapter.setState('enigma2.EVENTDESCRIPTION', { val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventdescription[0], ack: true });

				var e2SERVICEREFERENCE = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicereference[0]);
				var e2SERVICEREFERENCE2 = e2SERVICEREFERENCE.replace(/:/g, '_').slice(0, -1);
				
				if (e2SERVICEREFERENCE === '-1:8087252:0:77132724:2:0:C:0:0:77040804:' || e2EVENTREMAINING === '0') {
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', { val: '', ack: true });
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', { val: '', ack: true });
				} else {
					adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', { val: e2SERVICEREFERENCE, ack: true });
					if (adapter.config.Webinterface === "true" || adapter.config.Webinterface === true) {
						adapter.getState('enigma2.STANDBY', function (err, state) {
							if (state.val === false) {
								//openwebif PICON http://...
								if(e2SERVICEREFERENCE.includes('/m')){
									adapter.setState('enigma2.CHANNEL', { val: e2SERVICEREFERENCE.slice(53, e2SERVICEREFERENCE.length).slice(0, (e2SERVICEREFERENCE.slice(53, e2SERVICEREFERENCE.length).indexOf(' -') + 1) - 1), ack: true });
									
									adapter.setState('enigma2.CHANNEL_PICON', { val: 'http://' + adapter.config.IPAddress + ':' + adapter.config.Port + '/picon/' + 'movieCenter' + '.png', ack: true });

									//get Servicereference Picon (base64)
									var imagePath = 'http://' + adapter.config.Username + ':' + adapter.config.Password + '@' + adapter.config.IPAddress + ':' + adapter.config.Port + '/picon/' + 'movieCenter' + '.png';
									GETPICON64(imagePath);
									
									adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', { val: 'movieCenter', ack: true });
								}else{
									adapter.setState('enigma2.CHANNEL', { val: xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventservicename[0], ack: true });
									
									adapter.setState('enigma2.CHANNEL_PICON', { val: 'http://' + adapter.config.IPAddress + ':' + adapter.config.Port + '/picon/' + e2SERVICEREFERENCE2 + '.png', ack: true });
									
									//get Servicereference Picon (base64)
									var imagePath = 'http://' + adapter.config.Username + ':' + adapter.config.Password + '@' + adapter.config.IPAddress + ':' + adapter.config.Port + '/picon/' + e2SERVICEREFERENCE2 + '.png';
									GETPICON64(imagePath);
									
									adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', { val: e2SERVICEREFERENCE2, ack: true });
								}
							} else {
								adapter.setState('enigma2.CHANNEL_PICON', { val: '', ack: true });
								adapter.setState('enigma2.CHANNEL_PICON64', { val: '', ack: true });
							}
						});
					}
				};
				
				//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

				var e2EVENTREMAINING_X, e2EVENTREMAINING, Step1, Step2, Step3;
				var e2Eventstart = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventstart[0]);
				var e2Eventend = (xml.e2currentserviceinformation.e2eventlist[0].e2event[1].e2eventstart[0]);
				
				if(e2SERVICEREFERENCE.includes('/m')){
					adapter.getState('enigma2.PROGRAMM', function (err, state) { 
					
							e2EVENTREMAINING_X =  e2EVENTDURATION_X - (Date.now()/1000 - state.lc/1000);
							adapter.setState('enigma2.EVENTREMAINING_MIN', { val: Math.round(e2EVENTREMAINING_X / 60), ack: true });
							
							e2EVENTREMAINING = sec2HMS(parseFloat(e2EVENTREMAINING_X));
							
							if (e2EVENTREMAINING === 'NaN:NaN:NaN' || e2EVENTREMAINING === '0') {
								adapter.setState('enigma2.EVENTREMAINING', { val: ''/*'0:0:0'*/, ack: true });
							} else {
								adapter.setState('enigma2.EVENTREMAINING', { val: e2EVENTREMAINING, ack: true });
							};
							
							//EVENT_PROGRESS_PERCENT
							Step1 = parseFloat((parseFloat(e2EVENTDURATION_X) - parseFloat(e2EVENTREMAINING_X)));
							Step2 = parseFloat((Step1 / parseFloat(e2EVENTDURATION_X)));
							Step3 = parseFloat((Math.round(Step2 * 100)));
							adapter.setState('enigma2.EVENT_PROGRESS_PERCENT', { val: parseInt(Step3), ack: true });
							
							if (state.lc !== e2Eventend) {
								//EVENT_TIME_START
								var date = new Date(state.lc);
								// Hours part from the timestamp
								var hours = date.getHours();
								// Minutes part from the timestamp
								var minutes = "0" + date.getMinutes();

								// Will display time in 10:30 format
								var formattedTime = hours + ':' + minutes.substr(-2);
								adapter.setState('enigma2.EVENT_TIME_START', { val: (formattedTime), ack: true });
							}else{
								adapter.setState('enigma2.EVENT_TIME_END', { val: '', ack: true });
								adapter.setState('enigma2.EVENT_TIME_START', { val: '', ack: true });
							}
							
							formattedTime, date, hours, minutes = null;
							
							//EVENT_TIME_END
							date = new Date(state.lc + (e2EVENTDURATION_X * 1000));
							// Hours part from the timestamp
							hours = date.getHours();
							// Minutes part from the timestamp
							minutes = "0" + date.getMinutes();
							// Will display time in 10:30 format
							formattedTime = hours + ':' + minutes.substr(-2);
							
							adapter.setState('enigma2.EVENT_TIME_END', { val: (formattedTime), ack: true });
							
							var Step1_1 = sec2HMS(parseInt(Step1));
							if (Step1_1 === 'NaN:NaN:NaN') {
								adapter.setState('enigma2.EVENT_TIME_PASSED', { val: "", ack: true });
							} else {
								adapter.setState('enigma2.EVENT_TIME_PASSED', { val: sec2HMS(parseInt(Step1)), ack: true });
							};
						});
				}else{
					e2EVENTREMAINING_X = (xml.e2currentserviceinformation.e2eventlist[0].e2event[0].e2eventremaining[0]);
					adapter.setState('enigma2.EVENTREMAINING_MIN', { val: Math.round(e2EVENTREMAINING_X / 60), ack: true });
					
					e2EVENTREMAINING = sec2HMS(parseFloat(e2EVENTREMAINING_X));
					
					if (e2EVENTREMAINING === 'NaN:NaN:NaN' || e2EVENTREMAINING === '0') {
						adapter.setState('enigma2.EVENTREMAINING', { val: ''/*'0:0:0'*/, ack: true });
					} else {
						adapter.setState('enigma2.EVENTREMAINING', { val: e2EVENTREMAINING, ack: true });
					};
					
					//EVENT_PROGRESS_PERCENT
					Step1 = parseFloat((parseFloat(e2EVENTDURATION_X) - parseFloat(e2EVENTREMAINING_X)));
					Step2 = parseFloat((Step1 / parseFloat(e2EVENTDURATION_X)));
					Step3 = parseFloat((Math.round(Step2 * 100)));
					adapter.setState('enigma2.EVENT_PROGRESS_PERCENT', { val: parseInt(Step3), ack: true });
					
					if (e2Eventstart !== e2Eventend) {
						//EVENT_TIME_START
						var date = new Date(e2Eventstart * 1000);
						// Hours part from the timestamp
						var hours = date.getHours();
						// Minutes part from the timestamp
						var minutes = "0" + date.getMinutes();

						// Will display time in 10:30 format
						var formattedTime = hours + ':' + minutes.substr(-2);
						adapter.setState('enigma2.EVENT_TIME_START', { val: (formattedTime), ack: true });
					}else{
						adapter.setState('enigma2.EVENT_TIME_END', { val: '', ack: true });
						adapter.setState('enigma2.EVENT_TIME_START', { val: '', ack: true });
					}
							
					formattedTime, date, hours, minutes = null;
					
					//EVENT_TIME_END
					date = new Date(e2Eventend * 1000);
					// Hours part from the timestamp
					hours = date.getHours();
					// Minutes part from the timestamp
					minutes = "0" + date.getMinutes();
					// Will display time in 10:30 format
					formattedTime = hours + ':' + minutes.substr(-2);
					
					adapter.setState('enigma2.EVENT_TIME_END', { val: (formattedTime), ack: true });
					
					//EVENT_TIME_PASSED //NaN:NaN:NaN
					var Step1_1 = sec2HMS(parseInt(Step1));
					if (Step1_1 === 'NaN:NaN:NaN') {
						adapter.setState('enigma2.EVENT_TIME_PASSED', { val: "", ack: true });
					} else {
						adapter.setState('enigma2.EVENT_TIME_PASSED', { val: sec2HMS(parseInt(Step1)), ack: true });
					};
				}
			}
			break;
		case "DEVICEINFO":
			adapter.setState('enigma2.WEB_IF_VERSION', { val: xml.e2deviceinfo.e2webifversion[0], ack: true });
			adapter.setState('enigma2.NETWORK', { val: xml.e2deviceinfo.e2network[0].e2interface[0].e2name[0], ack: true });
			adapter.setState('enigma2.BOX_IP', { val: xml.e2deviceinfo.e2network[0].e2interface[0].e2ip[0], ack: true });
			adapter.setState('enigma2.MODEL', { val: xml.e2deviceinfo.e2devicename[0], ack: true });
			break;
		case "DEVICEINFO_HDD":
			if (xml.e2deviceinfo.e2hdds[0].e2hdd !== undefined) {

				adapter.setObjectNotExists('enigma2.HDD_CAPACITY', {
					type: 'state',
					common: {
						type: 'string',
						role: 'state',
						name: 'maximal Flash Capacity (Flash 1)',
						read: true,
						write: false
					},
					native: {}
				});
				adapter.setObjectNotExists('enigma2.HDD_FREE', {
					type: 'state',
					common: {
						type: 'string',
						role: 'state',
						name: 'free Flash Capacity (Flash 1)',
						read: true,
						write: false
					},
					native: {}
				});

				adapter.setState('enigma2.HDD_CAPACITY', { val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2capacity[0], ack: true });
				adapter.setState('enigma2.HDD_FREE', { val: xml.e2deviceinfo.e2hdds[0].e2hdd[0].e2free[0], ack: true });
				if (xml.e2deviceinfo.e2hdds[0].e2hdd[1] !== undefined) {

					adapter.setObjectNotExists('enigma2.HDD2_CAPACITY', {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'maximal Flash Capacity (Flash 2)',
							read: true,
							write: false
						},
						native: {}
					});
					adapter.setObjectNotExists('enigma2.HDD2_FREE', {
						type: 'state',
						common: {
							type: 'string',
							role: 'state',
							name: 'free Flash Capacity (Flash 2)',
							read: true,
							write: false
						},
						native: {}
					});

					adapter.setState('enigma2.HDD2_CAPACITY', { val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2capacity[0], ack: true });
					adapter.setState('enigma2.HDD2_FREE', { val: xml.e2deviceinfo.e2hdds[0].e2hdd[1].e2free[0], ack: true });
				} else {
					adapter.delObject('enigma2.HDD2_CAPACITY');
					adapter.delObject('enigma2.HDD2_FREE');
				};
			} else {
				adapter.delObject('enigma2.HDD2_CAPACITY');
				adapter.delObject('enigma2.HDD2_FREE');
				adapter.delObject('enigma2.HDD_CAPACITY');
				adapter.delObject('enigma2.HDD_FREE');
			}

			break;
		case "VOLUME_UP":
		case "VOLUME_DOWN":
		case "LEFT":
		case "RIGHT":
		case "UP":
		case "DOWN":
		case "EXIT":
		case "CH_UP":
		case "CH_DOWN":
		case "SELECT":
		case "OK":
		case "BOUQUET_UP":
		case "BOUQUET_DOWN":
		case "INFO":
		case "MENU":
		case "TIMERLIST":
			let result = [];
			if (adapter.config.timerliste === "true" || adapter.config.timerliste === true) {
				if (xml && xml.e2timerlist && xml.e2timerlist.e2timer) {
					let timerList = xml.e2timerlist.e2timer;

					timerList.forEach(function (timerItem) {
						result.push(
							{
								title: timerItem["e2name"].toString(),
								channel: timerItem["e2servicename"].toString(),
								serviceRef: timerItem["e2servicereference"].toString(),
								serviceRefName: timerItem["e2servicereference"].toString().replace(/:/g, '_').slice(0, -1),
								starTime: timerItem["e2timebegin"].toString(),
								endTime: timerItem["e2timeend"].toString(),
								duration: timerItem["e2duration"].toString(),
								subtitle: timerItem["e2description"].toString(),
								description: timerItem["e2descriptionextended"].toString(),
							}
						)
					});

					// only update if we have a result -> keep on data if box is in deepStandby
					result = JSON.stringify(result);

					adapter.getState('enigma2.TIMER_LIST', function (err, state) {
						// only update if we have new timer	
						if (state && state.val !== null) {
							if (result !== state.val) {
								adapter.setState('enigma2.TIMER_LIST', result, true);
							} else {
								adapter.log.debug("no new timer found -> timer list is up to date");
							}
						} else {
							adapter.setState('enigma2.TIMER_LIST', result, true);
						}
					});
				}
			}
			break;
		case "GETMOVIELIST":
			try {
				if (xml && xml.e2locations && xml.e2locations.e2location) {

					let movieList = [];
					let movieDirs = xml.e2locations.e2location;
					let allServices = await getResponseAsync(deviceId, PATH['GETALLSERVICES']);		// list of all services to get the ref for movies (picons)					

					let servicesList = [];
					if (allServices && allServices.e2servicelistrecursive && allServices.e2servicelistrecursive.e2bouquet) {
						// prepare serviceList
						for (var bouquet of allServices.e2servicelistrecursive.e2bouquet) {
							if (bouquet && bouquet.e2servicelist) {
								for (var service of bouquet.e2servicelist) {
									servicesList.push(...service.e2service)
								}
							}
						}

						//remove duplicates
						servicesList = servicesList.filter(obj => !servicesList[obj.e2servicereference] && (servicesList[obj.e2servicereference] = true));
					}

					for (var dir of movieDirs) {
						// iterate through media directories
						await getAllMovies(dir, movieList, servicesList);
						await Sleep(500);
					}

					movieList = JSON.stringify(movieList);

					let state = await adapter.getStateAsync('enigma2.MOVIE_LIST');

					// only update if we have new movies	
					if (state && state.val !== null) {
						if (movieList !== state.val) {
							if(movieList !== '[]'){
								adapter.setState('enigma2.MOVIE_LIST', movieList, true);
							}
						} else {
							adapter.log.debug("no new movies found -> movies list is up to date");
						}
					} else {
						if(movieList !== '[]'){
								adapter.setState('enigma2.MOVIE_LIST', movieList, true);
						}
					}
				}
			} catch (err) {
				adapter.log.error(`[GETMOVIELIST] error: ${err.message}`);
				adapter.log.error("[GETMOVIELIST] stack: " + err.stack);
			}

			break;
		default:
			adapter.log.info("received unknown command '" + command + "' @ evaluateCommandResponse");
	}
}

async function getAllMovies(directory, movieList, servicesList) {

	try {
		if (adapter.config.movieliste === "true" || adapter.config.movieliste === true) {
			if (adapter.config.Webinterface === "true" || adapter.config.Webinterface === true) {
				// openwebif api
				let result = await getResponseAsync(deviceId, `/api/movielist?dirname=${encodeURI(directory)}`);

				if (result) {
					if (result.movies && result.movies.length > 0) {
						for (var movie of result.movies) {
							var service = servicesList.filter(obj => {
								return obj.e2servicename.toString() === movie.servicename.toString();
							});

							if (service && service[0]) {
								movie.service = service[0].e2servicereference.toString();
								movie.serviceRefName = service[0].e2servicereference.toString().replace(/:/g, '_').slice(0, -1);
							}
							movieList.push(movie);
						}
					}

					if (result.bookmarks && result.bookmarks.length > 0) {
						for (var subDir of result.bookmarks) {
							await getAllMovies(directory + subDir + '/', movieList, servicesList);
							await Sleep(500);
						}
					}
				}
			} else {
				// TODO: dream api
			}
		}
	} catch (err) {
		adapter.log.error(`[getAllMovies] dir: ${directory}, error: ${err.message}`);
		adapter.log.error("[getAllMovies] stack: " + err.stack);
	}
}

function ISRECORD() {
	var result;
	try {
		require("request")('http://' + adapter.config.Username + ':' + adapter.config.Password + '@' + adapter.config.IPAddress + ':' + adapter.config.Port + PATH['ISRECORD'], function (error, response, result) {
			if (result !== undefined) {
				if (result.indexOf('<e2state>2</e2state>') != -1) {
					adapter.setState('enigma2.isRecording', { val: true, ack: true });
				} else {
					adapter.setState('enigma2.isRecording', { val: false, ack: true });
				}
				// Timer is set
				if (result.indexOf('<e2state>2</e2state>') != -1) {
					adapter.setState('enigma2.Timer_is_set', { val: true, ack: true });
				} else if (result.indexOf('<e2state>0</e2state>') != -1) {
					adapter.setState('enigma2.Timer_is_set', { val: true, ack: true });
				} else {
					adapter.setState('enigma2.Timer_is_set', { val: false, ack: true });
				}
			}
		}).on("error", function (e) { console.error(e); });
	} catch (e) { console.error(e); }
}

function GETPICON64(imagePath) {
	var result;
	try {
		require('request').defaults({ encoding: null })(imagePath, function (error, response, result) {
			if (!error && response.statusCode == 200) {
				var data = '<img src="' + "data:" + response.headers["content-type"] + ";base64," + new Buffer(result).toString('base64') + '" style="width: 170px; height: 103px;" />';
				adapter.setState('enigma2.CHANNEL_PICON64', { val: data, ack: true });
			}
		}).on("error", function (e) { console.error(e); });
	} catch (e) { console.error(e); }
}

function setStatus(status) {
	if (status != isConnected) {
		isConnected = status;
		if (isConnected) {
			adapter.log.info("enigma2 Verbunden!");
			adapter.setState('enigma2-CONNECTION', true, true);
			getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
			getResponse('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER'], evaluateCommandResponse);
			getResponse('GETCURRENT', deviceId, PATH['GET_CURRENT'], evaluateCommandResponse);
			getResponse('ISRECORD', deviceId, PATH['ISRECORD'], ISRECORD);
			getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], evaluateCommandResponse);
			//getResponse('GETMOVIELIST', deviceId, PATH['GETLOCATIONS'], evaluateCommandResponse);
			getResponse('DEVICEINFO', deviceId, PATH['DEVICEINFO'], evaluateCommandResponse);
		} else {
			adapter.log.info("enigma2: " + adapter.config.IPAddress + ":" + adapter.config.Port + " ist nicht erreichbar!");
			adapter.setState('enigma2-CONNECTION', false, true);
			adapter.setState('enigma2.isRecording', false, true);
			// Werte aus Adapter loeschen
			adapter.setState('enigma2.BOX_IP', "");
			adapter.setState('enigma2.CHANNEL', "");
			adapter.setState('enigma2.CHANNEL_PICON', "");
			adapter.setState('enigma2.CHANNEL_PICON64', "");
			adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE', "");
			adapter.setState('enigma2.CHANNEL_SERVICEREFERENCE_NAME', "");
			adapter.setState('enigma2.EVENTDESCRIPTION', "");
			adapter.setState('enigma2.EVENTDURATION', "");
			adapter.setState('enigma2.EVENTDURATION_MIN', "");
			adapter.setState('enigma2.EVENT_PROGRESS_PERCENT', "0", true);
			adapter.setState('enigma2.EVENTREMAINING', "");
			adapter.setState('enigma2.EVENTREMAINING_MIN', "");
			adapter.setState('enigma2.EVENT_TIME_END', "");
			adapter.setState('enigma2.EVENT_TIME_PASSED', "");
			adapter.setState('enigma2.EVENT_TIME_START', "");
			adapter.setState('enigma2.MESSAGE_ANSWER', "");
			adapter.setState('enigma2.MODEL', "");
			adapter.setState('enigma2.NETWORK', "");
			adapter.setState('enigma2.PROGRAMM', "");
			adapter.setState('enigma2.PROGRAMM_AFTER', "");
			adapter.setState('enigma2.PROGRAMM_AFTER_INFO', "");
			adapter.setState('enigma2.PROGRAMM_INFO', "");
			adapter.setState('enigma2.STANDBY', true, true);
			adapter.setState('enigma2.WEB_IF_VERSION', "");
			adapter.setState('Message.MESSAGE_ANSWER', false, true);
		}
	}
}

function main() {

	adapter.setObjectNotExists('Message.Text', {
		type: 'state',
		common: {
			type: 'string',
			role: 'text',
			name: 'Send a info Message to the Receiver Screen',
			desc: 'messagetext=Text of Message',
			read: false,
			write: true
		},
		native: {}
	});
	
	adapter.setObjectNotExists('Message.Type', {
		type: 'state',
		common: {
			type: 'number',
			role: 'state',
			name: 'Message Typ: 0= Yes/No, 1= Info, 2=Message, 3=Attention',
			desc: 'messagetype=Number from 0 to 3, 0= Yes/No, 1= Info, 2=Message, 3=Attention',
			states: {
				0: 'Yes/No',
				1: 'Info',
				2: 'Message',
				3: 'Attention'
			},
			min: 0,
			max: 3,
			read: true,
			write: true
		},
		native: {}
	});
	adapter.setState('Message.Type', 1, true);
	
	adapter.setObjectNotExists('Message.Timeout', {
		type: 'state',
		common: {
			type: 'number',
			role: 'control',
			desc: 'timeout=Can be empty or the Number of seconds the Message should disappear after',
			read: true,
			write: true
		},
		native: {}
	});
	adapter.setState('Message.Timeout', 15, true);

	//Verbindung
	adapter.setObjectNotExists('enigma2-CONNECTION', {
		type: 'state',
		common: {
			type: 'boolean',
			role: 'state',
			name: 'Connection to Receiver',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setState('enigma2-CONNECTION', false, true);

	//ALEXA
	if (adapter.config.Alexa === 'true' || adapter.config.Alexa === true) {
		adapter.setObjectNotExists('Alexa_Command.Standby', {
			type: 'state',
			common: {
				type: 'boolean',
				role: 'state',
				name: 'Receiver Standby Toggle with Alexa (true=Receiver ON / false=Receiver OFF)',
				read: true,
				write: true
			},
			native: {}
		});
		adapter.setObjectNotExists('Alexa_Command.Mute', {
			type: 'state',
			common: {
				type: 'boolean',
				role: 'state',
				name: 'Receiver Mute Toggle with Alexa (true=volume ON / false=Volume OFF)',
				read: true,
				write: true
			},
			native: {}
		});
	} else {
		adapter.delObject('Alexa_Command.Standby');
		adapter.delObject('Alexa_Command.Mute');
	};

	//STATE
	adapter.setObjectNotExists('enigma2.VOLUME', {
		type: 'state',
		common: {
			type: 'number',
			role: 'level.volume',
			name: 'Volume 0-100%',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.MESSAGE_ANSWER', {
		type: 'state',
		common: {
			type: 'integer',
			role: 'message',
			name: 'Message Answer',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.MUTED', {
		type: 'state',
		common: {
			type: 'boolean',
			role: 'media.mute',
			name: 'is Muted',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.STANDBY', {
		type: 'state',
		common: {
			type: 'boolean',
			role: 'state',
			name: 'Receiver in Standby',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.CHANNEL', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Channel Name',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.CHANNEL_SERVICEREFERENCE', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Servicereference Code',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.CHANNEL_SERVICEREFERENCE_NAME', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Servicereference Name',
			read: true,
			write: false
		},
		native: {}
	});
	if (adapter.config.Webinterface === "true" || adapter.config.Webinterface === true) {
		// openwebif api
		adapter.setObjectNotExists('enigma2.CHANNEL_PICON', {
			type: 'state',
			common: {
				type: 'string',
				role: 'state',
				name: 'Servicereference Picon',
				read: true,
				write: false
			},
			native: {}
		});
	} else {
		adapter.delObject('enigma2.CHANNEL_PICON');
	}
	if (adapter.config.Webinterface === "true" || adapter.config.Webinterface === true) {
		// openwebif api
		adapter.setObjectNotExists('enigma2.CHANNEL_PICON64', {
			type: 'state',
			common: {
				type: 'string',
				role: 'state',
				name: 'Servicereference Picon (base64)',
				read: true,
				write: false
			},
			native: {}
		});
	} else {
		adapter.delObject('enigma2.CHANNEL_PICON64');
	}
	adapter.setObjectNotExists('enigma2.PROGRAMM', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'current Programm',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.PROGRAMM_INFO', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'current Programm Info',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.PROGRAMM_AFTER', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Programm after',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.PROGRAMM_AFTER_INFO', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Programm Info after',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.EVENTDESCRIPTION', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Event description',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENTDURATION', {
		type: 'state',
		common: {
			type: 'number',
			role: 'media.duration.text',
			name: 'Event Duration in H:M:S',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENTREMAINING', {
		type: 'state',
		common: {
			type: 'number',
			role: 'media.elapsed.text',
			name: 'Event Remaining in H:M:S',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENTDURATION_MIN', {
		type: 'state',
		common: {
			type: 'number',
			role: 'media.duration',
			name: 'Event Duration in Minute',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENTREMAINING_MIN', {
		type: 'state',
		common: {
			type: 'number',
			role: 'media.elapsed',
			name: 'Event Remaining in Minute',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENT_PROGRESS_PERCENT', {
		type: 'state',
		common: {
			type: 'number',
			role: 'media.progress',
			name: 'Event Progress Percent',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENT_TIME_PASSED', {
		type: 'state',
		common: {
			type: 'string',
			role: 'media.broadcastDate',
			name: 'Event Time Passed',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENT_TIME_START', {
		type: 'state',
		common: {
			type: 'string',
			role: 'media.broadcastDate',
			name: 'Event Start',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists('enigma2.EVENT_TIME_END', {
		type: 'state',
		common: {
			type: 'string',
			role: 'media.broadcastDate',
			name: 'Event End',
			read: true,
			write: false
		},
		native: {}
	});

	// in this example all states changes inside the adapters namespace are subscribed
	adapter.subscribeStates('*');
	adapter.log.info("starting Polling every " + adapter.config.PollingInterval + " ms");

	event_interval = setInterval(function () {
		getResponse('GETSTANDBY', deviceId, PATH['POWERSTATE'], evaluateCommandResponse);
		getResponse('MESSAGEANSWER', deviceId, PATH['MESSAGEANSWER'], evaluateCommandResponse);
		getResponse('GETCURRENT', deviceId, PATH['GET_CURRENT'], evaluateCommandResponse);
		getResponse('ISRECORD', deviceId, PATH['ISRECORD'], ISRECORD);
		getResponse('TIMERLIST', deviceId, PATH['TIMERLIST'], evaluateCommandResponse);
	}, adapter.config.PollingInterval);
}

function main2() {

	adapter.setObjectNotExists('enigma2.MODEL', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Receiver Model',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.WEB_IF_VERSION', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Receiver Webinterface Version',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.NETWORK', {
		type: 'state',
		common: {
			type: 'string',
			role: 'state',
			name: 'Receiver used Network',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.BOX_IP', {
		type: 'state',
		common: {
			type: 'string',
			role: 'info.ip',
			name: 'Receiver IP-Adress',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.isRecording', {
		type: 'state',
		common: {
			type: 'boolean',
			role: 'state',
			name: 'Receiver is Recording',
			read: true,
			write: false
		},
		native: {}
	});
	adapter.setObjectNotExists('enigma2.Timer_is_set', {
		type: 'state',
		common: {
			type: 'boolean',
			role: 'state',
			name: 'min 1 Timer is set',
			read: true,
			write: false
		},
		native: {}
	});
	if (adapter.config.timerliste === "true" || adapter.config.timerliste === true) {
		adapter.setObjectNotExists('enigma2.TIMER_LIST', {
			type: 'state',
			common: {
				type: 'string',
				role: 'info',
				name: 'Timer List',
				read: true,
				write: false
			},
			native: {}
		});
	} else {
		adapter.delObject('enigma2.TIMER_LIST');
	}
	if (adapter.config.movieliste === "true" || adapter.config.movieliste === true) {
		adapter.setObjectNotExists('enigma2.MOVIE_LIST', {
			type: 'state',
			common: {
				type: 'string',
				role: 'info',
				name: 'Movie List',
				read: true,
				write: false
			},
			native: {}
		});
	} else {
		adapter.delObject('enigma2.MOVIE_LIST');
	}
}

function Sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}
