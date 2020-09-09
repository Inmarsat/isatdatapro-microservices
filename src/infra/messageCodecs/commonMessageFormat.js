'use strict';

/**
 * Returns the interpreted value of the field based on dataType
 * @param {object} field A payload field { name, value, dataType }
 * @returns {boolean|number|Buffer|Array|string} dependent on data type
 */
function parseFieldValue(field) {
  if (!field.dataType) return field.stringValue;
  switch (field.dataType) {
    case 'boolean':
      return (field.stringValue.toLowerCase() === 'true');
    case 'signedint':
    case 'unsignedint':
      return Number(field.stringValue);
    case 'data':
      return Buffer.from(field.stringValue, 'base64');
    case 'array':
      let items = [];
      for (let e=0; e < field.arrayElements.length; e++) {
        const element = field.arrayElements[e];
        let subItems = [];
        for (let f=0; f < element.fields.length; f++) {
          const field = element.fields[f];
          subItems[f] = {
            name: field.name,
            value: parseFieldValue(field),
          };
        }
        items[e] = subItems;
      }
      return items;
    case 'enum':
      //TODO: lookup from message definition file?
    case 'string':
    default:
      return field.stringValue;
  }
}

/**
 * Parses a JSON payload, replacing string values with proper type
 * @param {Object} message A ReturnMessage
 * @returns {Object} parsed message
 */
function parse(message) {
  if (!message.payloadJson) {
    throw new Error(`Message ${message.messageId} has no JSON payload to parse`);
  }
  let parsedMessage = {
    receivedTimeUtc: message.receivedTimeUtc,
    codecServiceId: message.codecServiceId,
    codecMessageId: message.codecMessageId,
    name: message.name,
  };
  message.payloadJson.fields.forEach(field => {
    parsedMessage[field.name] = parseFieldValue(field);
  });
  return parsedMessage;
}

module.exports = {
  parseFieldValue,
  parse,
};