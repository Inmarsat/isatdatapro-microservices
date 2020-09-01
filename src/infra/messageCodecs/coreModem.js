'use strict';

const codecServiceId = 0;
const logger = require('../logging').loggerProxy(__filename);
const Mobile = require('../database/models/Mobile');
const { Payload, Field } = require('../database/models/MessagePayloadJson');
const ReturnMessage = require('../database/models/MessageReturn');
const ForwardMessage = require('../database/models/MessageForward');
const { parseFieldValue } = require('./commonMessageFormat');
const event = require('../eventHandler');

/**
 * Rounds a number to a certain decimal precision
 * @param {number} num A decimal number
 * @param {number} places The number of decimal places to round to
 * @returns {number} rounded
 */
function roundTo(num, places) {
  if (typeof (places) !== 'number') places = 0;
  return +(Math.round(num + 'e+' + places) + 'e-' + places);
}

/**
 * Returns a datestamp from a day and minute, assuming the current year
 * @param {number} year Full year UTC
 * @param {number} month From 0..11 UTC
 * @param {number} dayOfMonth Day of month from 1..31 UTC
 * @param {number} minuteOfDay Minute of day from 0..1439 UTC
 * @returns {Date}
 */
function timestampFromMinuteDay(year, month, dayOfMonth, minuteOfDay) {
  const hour = minuteOfDay / 60;
  const minute = minuteOfDay % 60;
  const tsDate = new Date(year, month, dayOfMonth, hour, minute);
  return tsDate;
}

/**
 * Returns the interpreted value of the field based on dataType
 * @param {object} field A payload field { name, value, dataType }
 */
/*
function parseFieldValue(field) {
  if (!field.dataType) return field.stringValue;
  switch (field.dataType) {
    case 'boolean':
      return Boolean(field.stringValue);
    case 'signedint':
    case 'unsignedint':
      return Number(field.stringValue);
    case 'data':
      return Buffer.from(field.stringValue, 'base64');
    case 'array':
      let items = [];
      field.arrayElements.forEach(element => {
        let item = {};
        element.fields.forEach(field => {
          item.name = field.name;
          item.value = parseFieldValue(field);
        });
        items.splice(element.index, 0, item);
      });
      return items;
    case 'enum':
      //TODO: lookup from message definition file?
    case 'string':
    default:
      return field.stringValue;
  }
}
*/

/**
 * Sets up mobile metadata template for update
 * @param {Message} message A Return or Forward message
 * @returns {Mobile} A Mobile object
 */
function populateMobile(message) {
  let mobile = new Mobile();
  mobile.mobileId = message.mobileId;
  mobile.mailboxId = message.mailboxId;
  if (message.receiveTimeUtc) {
    mobile.lastMessageReceivedTimeUtc = message.receiveTimeUtc;
    mobile.satelliteRegion = message.satelliteRegion;
  } else {
    mobile.mobileWakeupPeriod = message.mobileWakeupPeriod;
  }
  return mobile;
}

/**
 * Logs a warning for parsing unknown field names
 * @param {string} fieldName The field name
 * @param {number} messageId The message ID
 */
function handleUnknownField(fieldName, messageId) {
  logger.warn(`Unknown field ${fieldName} in message ${messageId}`);
}

/**
 * Parses Inmarsat-defined standard modem Mobile-Originated messages
 * and emits various events
 * @public
 * @param {MessageReturn} message The message with metadata
 * @param {DatabaseContext} database The database connection
 * @returns {Object} mobile metadata
 */
function parseCoreModem(message, database) {
  if (!message.payloadJson || message.codecServiceId !== 0) {
    throw new Error(`Attempt to parse message ${message.messageId} as core modem`);
  }
  const messageType = message.payloadJson.codecMessageId;
  switch (messageType) {
    case 97:
    case 1:
    case 0:
      return parseModemRegistration(message);
    case 2:
      parseModemProtocolError(message);
      break;
    case 70:
      return parseModemSleepSchedule(message);
    case 72:
      return parseModemLocation(message);
    case 98:
      parseModemLastRxInfo(message);
      break;
    case 99:
      parseModemRxMetrics(message);
      break;
    case 100:
      parseModemTxMetrics(message);
      break;
    case 112:
      parseModemPingReply(message);
      break;
    case 113:
      parseNetworkPingRequest(message);
      break;
    case 115:
      return parseModemBroadcastIds(message);
    default:
      logger.warn(`No parsing logic defined for SIN 0 MIN ${messageType}`);
  }
}

/**
 * Parses the Registration message or Configuration response
 * @private
 * @param {MessagePayload} message JSON Payload structure
 * @param {MessageMetadata} meta Metadata including mobileId, timestamp, [topic]
 * @returns {Object} { mobile, event }
 */
function parseModemRegistration(message) {
  let mobile = populateMobile(message);
  mobile.lastRegistrationTimeUtc = message.receiveTimeUtc;
  let tmp = {};
  message.payloadJson.fields.forEach((field) => {
    switch (field.name) {
      case 'hardwareMajorVersion':
        tmp.hwMajor = parseFieldValue(field);
        break;
      case 'hardwareMinorVersion':
        tmp.hwMinor = parseFieldValue(field);
        break;
      case 'softwareMajorVersion':
        tmp.fwMajor = parseFieldValue(field);
        break;
      case 'softwareMinorVersion':
        tmp.fwMinor = parseFieldValue(field);
        break;
      case 'product':
        tmp.productId = parseFieldValue(field);
        break;
      case 'wakeupPeriod':
        mobile.mobileWakeupPeriod = parseFieldValue(field);
        break;
      case 'lastResetReason':
        mobile.lastResetReason = parseFieldValue(field);
        break;
      case 'virtualCarrier':
        tmp.vcId = parseFieldValue(field);
        break;
      case 'beam':
        tmp.beamId = parseFieldValue(field);
        break;
      case 'vain':
        tmp.vain = parseFieldValue(field);
        break;
      case 'operatorTxState':
        mobile.operatorTxState = parseFieldValue(field);
        break;
      case 'userTxState':
        mobile.userTxState = parseFieldValue(field);
        break;
      case 'broadcastIDCount':
        mobile.broadcastIdCount = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  mobile.version.hardware = `${tmp.hwMajor}.${tmp.hwMinor}`;
  mobile.version.firmware = `${tmp.fwMajor}.${tmp.fwMinor}`;
  mobile.version.productId = `${tmp.productId}`;
  switch (message.codecMessageId) {
    case 0:
      event.modemRegistration(mobile);
      break;
    case 1:
      event.modemBeamSwitch(mobile);
      break;
    default:
      event.modemConfigReply(mobile);
  }
  event.modemRegistration(mobile);
  return mobile;
}

/**
 * Parses the modem error message
 * @private
 * @param {MessageReturn} message The return message
 */
function parseModemProtocolError(message) {
  let error = {
    mobileId: message.mobileId,
    messageId: message.messageId,
    timestamp: message.receiveTimeUtc,
    messageReference: null,
    errorCode: null,
    errorInfo: null,
  };
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'messageReference':
        error.messageReference = parseFieldValue(field);
        break;
      case 'errorCode':
        error.errorCode = parseFieldValue(field);
        break;
      case 'errorInfo':
        error.errorInfo = parseFieldValue(field);
        break;
      default:
        logger.warn(`Unknown field ${field.name} in ${message.name}`);
    }
  });
  event.modemProtocolError(error);
  return error;
}

/**
 * Returns the wakeup interval in seconds
 * @private
 * @param {number | string} wakeupCode 
 * @returns {number} interval in seconds
 */
function getWakeupSeconds(wakeupCode) {
  let interval = 5;
  switch (wakeupCode) {
    case 0:
    case 'None':
      break;
    case 1:
    case 'Seconds30':
      interval = 30;
      break;
    case 2:
    case 'Seconds60':
      interval = 60;
      break;
    case 3:
    case 'Minutes3':
      interval = 3 * 60;
      break;
    case 4:
    case 'Minutes10':
      interval = 10 * 60;
      break;
    case 5:
    case 'Minutes30':
      interval = 30 * 60;
      break;
    case 6:
    case 'Minutes2':
      interval = 2 * 60;
      break;
    case 7:
    case 'Minutes5':
      interval = 5 * 60;
      break;
    case 8:
    case 'Minutes15':
      interval = 15 * 60;
      break;
    case 9:
    case 'Minutes20':
      interval = 20 * 60;
      break;
    default:
      console.warn(`unrecognized wakeupPeriod: ${wakeupCode}`);
  }
  return interval;
}

/**
 * Parses wakeup interval change notification
 * @private
 * @param {MessageReturn} message JSON Payload structure
 * @returns {object} { mobile, event }
 */
function parseModemSleepSchedule(message) {
  let mobile = populateMobile(message);
  let eventDetail = {};
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'wakeupPeriod':
        mobile.mobileWakeupPeriod = parseFieldValue(field);
        let wakeupSeconds = getWakeupSeconds(mobile.mobileWakeupPeriod);
        eventDetail.mobileWakeupPeriod = `${wakeupSeconds} seconds`;
        break;
      case 'mobileInitiated':
        eventDetail.localInitiated = parseFieldValue(field);
        break;
      case 'messageReference':
        eventDetail.messageReference = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  event.modemWakeupPeriodChange(eventDetail);
  return mobile;
}

/**
 * Parses location and timestamp data to update the IdpMobiles collection with device metadata
 * @private
 * @param {ReturnMessage} message The location message
 * @returns {Mobile} The Mobile metadata
 */
function parseModemLocation(message) {
  let mobile = populateMobile(message);
  let tmp = {};
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'latitude':
      case 'longitude':
        mobile.location[field.name] = roundTo(parseFieldValue(field) / 60000, 6);
        break;
      case 'altitude':
      case 'speed':
      case 'heading':
      case 'fixStatus':
        mobile.location[field.name] = parseFieldValue(field);
        break;
      case 'dayOfMonth':
      case 'minuteOfDay':
        tmp[field.name] = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  const rxTime = new Date(message.receiveTimeUtc);
  const year = rxTime.getUTCFullYear();
  const month = rxTime.getUTCMonth(); //months from 0-11
  mobile.location.timestamp = timestampFromMinuteDay(
    year, month, tmp.dayOfMonth, tmp.minuteOfDay);
  return mobile;
}

/**
 * Parses response to query for last receive information
 * @private
 * @param {ReturnMessage} message The lastRxInfo message
 */
function parseModemLastRxInfo(message) {
  let eventDetail = {};
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'sipValid':
      case 'subframe':
      case 'packets':
      case 'packetsOK':
      case 'frequencyOffset':
      case 'timingOffset':
      case 'packetCNO':
      case 'uwCNO':
      case 'uwRSSI':
      case 'uwSymbols':
      case 'uwErrors':
      case 'packetSymbols':
      case 'packetErrors':
        eventDetail[field.name] = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  event.modemLastRxInfoResponse(eventDetail);
}

const METRICS_PERIODS = {
  'SinceReset': 0,
  'LastPartialMinute': 1,
  'LastFullMinute': 2,
  'LastPartialHour': 3,
  'LastFullHour': 4,
  'LastPartialDay': 5,
  'LastFullDay': 6,
};

/**
 * Returns a string value of the metrics period, since it may not be an integer (e.g. 'partial minute' is non-specific)
 * @param {string | number} periodCode The period over which metrics were calculated by the modem
 * @returns {string}
 */
function getMetricsPeriod(periodCode) {
  let period = 'UNKNOWN';
  switch (periodCode) {
    case 0:
    case 'SinceReset':
      period = 'SinceReset';
      break;
    case 1:
    case 'LastPartialMinute':
      period = 'LastPartialMinute';
      break;
    case 2:
    case 'LastFullMinute':
      period = 'LastFullMinute';
      break;
    case 3:
    case 'LastPartialHour':
      period = 'LastPartialHour';
      break;
    case 4:
    case 'LastFullHour':
      period = 'LastFullHour';
      break;
    case 5:
    case 'LastPartialDay':
      period = 'LastPartialDay';
      break;
    case 6:
    case 'LastFullDay':
      period = 'LastFullDay';
      break;
    case 15:
    case 14:
    case 13:
    case 12:
    case 11:
    case 10:
    case 9:
    case 8:
    case 7:
    default:
      period = 'Reserved';
  }
  return period;
}

/**
 * Parses response to get receive metrics
 * @private
 * @param {ReturnMessage} message The message
 * @param {MessageMetadata} meta Metadata including mobileId, timestamp, [topic]
 */
function parseModemRxMetrics(message) {
  let eventDetail = {};
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'period':
        eventDetail.period = getMetricsPeriod(parseFieldValue(field));
        break;
      case 'AvgCN0':
        eventDetail.avgSnr = parseFieldValue(field);
        break;
      case 'SamplesCN0':
        eventDetail.samplesSnr = parseFieldValue(field);
        break;
      case 'ChannelErrorRate':
        eventDetail.channelErrorRate = parseFieldValue(field);
        break;
      case 'numSegments':
      case 'numSegmentsOk':
      case 'uwErrorRate':
        eventDetail[field.name] = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  event.modemRxMetricsReply(eventDetail);
}

/**
 * Parses response to get transmit metrics
 * @private
 * @param {ReturnMessage} message The return message
 */
function parseModemTxMetrics(message) {
  let eventDetails = {};
  let tmp = {};
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'period':
        eventDetails.period = getMetricsPeriod(parseFieldValue(field));
        break;
      case 'packetTypeMask':
        let packetTypeMask = parseFieldValue(field);
        tmp.bitmask = [];
        for (let b = 0; b < 8; b++) {
          tmp.bitmask[b] = (packetTypeMask >> b) & 1;
        }
        break;
      case 'txMetrics':
        tmp.txMetrics = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  eventDetails.txMetrics = [];
  for (let i = 0; i < tmp.bitmask.length; i++) {
    if (bitmask[i] === 1) {
      let metric = {};
      switch (i) {
        case 0:
          metric.type = 'ack';
          break;
        case 1:
          metric.type = '0.5s subframe 0.33 rate';
          break;
        case 2:
          metric.type = '0.5s subframe 0.5 rate';
          break;
        case 3:
          metric.type = '0.5s subframe 0.75 rate';
          break;
        case 5:
          metric.type = '1s subframe 0.33 rate';
          break;
        case 6:
          metric.type = '1s subframe 0.5 rate';
          break;
        default:
          metric.type = 'undefined';
      }
      tmp.txMetrics.forEach(txMetric => {
        switch (txMetric.name) {
          case 'PacketsTotal':
            metric.segmentsTotal = txMetric.value;
            break;
          case 'PacketsSuccess':
            metric.segmentsOk = txMetric.value;
            break;
          case 'PacketsFailed':
            metric.segmentsFailed = txMetric.value;
            break;
          default:
            handleUnknownField(txMetric.name, message.messageId);
        }
      });
      eventDetails.txMetrics.push(metric);
    }
  }
  event.modemTxMetricsReply(eventDetails);
}

/**
 * Returns the converted pingTime field value from timestamp
 * @param {string} timestamp datestamp
 * @returns {number}
 */
function pingTime(timestamp) {
  let d;
  if (typeof (timestamp) === 'undefined') {
    d = new Date();
  } else {
    d = new Date(timestamp);
  }
  //console.debug(`returning ${d}`);
  return (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) % 65535;
}

/**
 * Parses a ping response to update the IdpMobiles collection metadata
 * @private
 * @param {ReturnMessage} message The return message
 */
function parseModemPingReply(message) {
  let latency = {};
  let requestTime, responseTime;
  let receiveTime = pingTime(message.receiveTimeUtc);
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'requestTime':
        requestTime = parseFieldValue(field);
        break;
      case 'responseTime':
        responseTime = parseFieldValue(field);
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  if (responseTime < requestTime) {
    responseTime += 65535;
    if (responseTime > 86399) { responseTime -= 86400 }
  }
  latency.forward = responseTime - requestTime;
  if (receiveTime < responseTime) {
    receiveTime += 65535;
    if (receiveTime > 86399) { receiveTime -= 86400 }
  }
  latency.return = receiveTime - responseTime;
  latency.roundTrip = latency.forward + latency.return;
  let eventDetails = {
    requestTime: requestTime,
    responseTime: responseTime,
    receiveTime: receiveTime,
    latency: latency,
  };
  event.modemPingReply(eventDetails);
}

/**
 * Parses request from modem for network ping response (note: response is automatically generated by the network)
 * @private
 * @param {ReturnMessage} message The return message
 */
function parseNetworkPingRequest(message) {
  let eventDetail = {};
  let requestTime;
  const receiveTime = pingTime(message.receiveTimeUtc);
  message.payloadJson.fields.forEach(field => {
    switch (field.name) {
      case 'requestTime':
        requestTime = parseFieldValue(field);
        eventDetail.latency = receiveTime - requestTime;
        break;
      default:
        handleUnknownField(field.name, message.messageId);
    }
  });
  event.networkPingRequest(eventDetail);
}

/**
 * Parses request from modem for network ping response (note: response is automatically generated by the network)
 * @private
 * @param {ReturnMessage} message The return message
 * @returns {Mobile} Mobile metadata
 */
function parseModemBroadcastIds(message) {
  try {
    let mobile = populateMobile(message);
    mobile.broadcastIds = [];
    message.payloadJson.fields.forEach(field => {
      switch (field.name) {
        case 'broadcastIDs':
          parseFieldValue(field).forEach(entry => {
            if (entry.value !== 0) {
              mobile.broadcastIds.push(entry.value);
            }
          });
          break;
        default:
          handleUnknownField(field.name, message.messageId);
      }
    });
    mobile.broadcastIdCount = mobile.broadcastIds.length;
    event.broadcastIdResponse(mobile.mobileId, mobile.broadcastIds);
    return mobile;
  } catch (e) {
    logger.error(e);
  }
}

//: ***** Mobile-Terminated (aka Forward) Message Parsers *********************

/**
 * Encodes the modem reset message based on the reset type
 * @param {string | number | undefined} resetType
 * @returns {ForwardMessage} Message and raw payload number array
 */
function commandReset(resetType) {
  const resetTypes = {
    'ModemPreserve': 0,
    'ModemFlush': 1,
    'Terminal': 2,
    'TerminalModemFlush': 3,
  };
  if (typeof (resetType) === 'undefined') {
    resetType = 'TerminalModemFlush';
  } else if (typeof(resetType) === 'number') {
    for (let t in resetTypes) {
      if (resetTypes[t] === resetType) {
        resetType = t;
      }
    }
    if (typeof(resetType) === 'number') {
      throw new Error(`Invalid resetType ${resetType}`);
    }
  }
  let payloadJson = new Payload('reset', 0, 68, true);
  payloadJson.addField(new Field('resetType', 'enum', resetType));
  // payloadRaw = [0, 68, resetType];
  return payloadJson;
}

/**
 * Returns a setWakeupPeriod message
 * @param {string|number} mobileWakeupPeriod A valid wakeupPeriod
 * @returns {ForwardMessage} The forward message
 * @throws {Error} if mobileWakeupPeriod is invalid
 */
function commandSetMobileWakeupPeriod(mobileWakeupPeriod) {
  const wakeupPeriods = {
    'None': 0,
    'Seconds30': 1,
    'Seconds60': 2,
    'Minutes3': 3,
    'Minutes10': 4,
    'Minutes30': 5,
    'Minutes2': 6,
    'Minutes5': 7,
    'Minutes15': 8,
    'Minutes20': 9,
  };
  
  function valueError() {
    throw new Error(`Invalid mobileWakeupPeriod ${mobileWakeupPeriod}`);
  }
  
  if (typeof(mobileWakeupPeriod) === 'string') {
    if (!(mobileWakeupPeriod in wakeupPeriods)) {
      valueError();
    }
  } else if (typeof(mobileWakeupPeriod) === 'number') {
    let isValid = false;
    for (let prop in wakeupPeriods) {
      if (wakeupPeriods.hasOwnProperty(prop) && wakeupPeriods[prop] === mobileWakeupPeriod) {
        isValid = true;
        break;
      }
    }
    if (!isValid) {
      valueError();
    }
  } else {
    valueError();
  }
  let payloadJson = new Payload('setSleepSchedule', 0, 70, true);
  payloadJson.addField(new Field('wakeupPeriod', 'enum', mobileWakeupPeriod));
  return payloadJson;
}

/**
 * Mutes or unmutes the modem transmitter
 * @param {boolean} muteFlag Set or clear transmit mute
 * @returns {ForwardMessage} The forward message
 */
function commandMute(muteFlag) {
  logger.warn('Feature not implemented');
  let payloadJson = new Payload('setTxMute', 0, 71, true);
  payloadJson.addField(new Field('reserved', 'unsignedint', 0));
  payloadJson.addField(new Field('txMute', 'boolean', muteFlag));
  return payloadJson;
}

/**
 * Returns payload for location request
 * @returns {Object} payload
 */
function commandGetLocation() {
  let payloadJson = new Payload('getPosition', 0, 72, true);
  // message.payloadRaw = [0, 72];
  return payloadJson;
}

/**
 * Gets modem configuration
 * @returns {ForwardMessage} The message
 */
function commandGetModemConfiguration() {
  let payloadJson = new Payload('getConfiguration', 0, 97, true);
  // message.payloadRaw = [0, 97];
  return payloadJson;
}

/**
 * Gets modem last receive information
 * @returns {ForwardMessage} The message
 */
function commandGetLastRxInfo() {
  let payloadJson = new Payload('getLastRxInfo', 0, 98, true);
  // message.payloadRaw = [0, 98];
  return payloadJson;
}

/**
 * 
 * @param {string} metricsPeriod 
 * @returns {ForwardMessage} The forward message
 */
function commandGetRxMetrics(metricsPeriod) {
  console.warn('Feature not tested');
  if (!(metricsPeriod in METRICS_PERIODS)) {
    throw new Error(`Invalid metrics period ${metricsPeriod}`);
  }
  let payloadJson = new Payload('getRxMetrics', 0, 99, true);
  payloadJson.addField(new Field('reserved', 'boolean', true));
  payloadJson.addField(new Field('period', 'enum', metricsPeriod));
  // message.payloadRaw = [0, 99, 2];
  return payloadJson;
}

/**
 * 
 * @param {string} metricsPeriod 
 * @returns {ForwardMessage} The forward message
 */
function commandGetTxMetrics(metricsPeriod) {
  console.warn('Feature not tested');
  if (!(metricsPeriod in METRICS_PERIODS)) {
    throw new Error(`Invalid metrics period ${metricsPeriod}`);
  }
  let payloadJson = new Payload('getRxMetrics', 0, 100, true);
  payloadJson.addField(new Field('Reserved', 'boolean', true));
  payloadJson.addField(new Field('MetricsPeriod', 'enum', metricsPeriod));
  // message.payloadRaw = [0, 100, 2];
  return payloadJson;
}

/**
 * Returns payload for a modem ping request
 * @returns {ForwardMessage} The forward message
 */
function commandModemPing() {
  let payloadJson = new Payload('pingModem', 0, 112, true);
  payloadJson.addField(new Field('requestTime', 'unsignedint', pingTime()));
  // TODO: calculate requestTime for rawPayload
  // message.payloadRaw = [0, 112];
  return payloadJson;
}

/**
 * Gets provisioned Broadcast IDs
 * @returns {ForwardMessage} The forward message
 */
function commandGetBroadcastIds() {
  let payloadJson = new Payload('requestBroadcastIds', 0, 115, true);
  // message.payloadRaw = [0, 115];
  return payloadJson;
}

module.exports = {
  codecServiceId,
  //parseCoreModem,
  parse: parseCoreModem,
  commandMessages: {
    reset: commandReset,
    setWakeupPeriod: commandSetMobileWakeupPeriod,
    setTxMute: commandMute,
    getLocation: commandGetLocation,
    getConfiguration: commandGetModemConfiguration,
    ping: commandModemPing,
    getBroadcastIds: commandGetBroadcastIds,
  }
};
