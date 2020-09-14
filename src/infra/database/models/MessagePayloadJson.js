'use strict';
//: not applicable (?) const Model = require('./model');

/**
 * Returns true if valid
 * @private
 * @param {number} id A number to validate
 * @returns {boolean}
 */
function isValidCodecId(id) {
  if (typeof(id) === 'number' && id >= 0 && id <= 255) {
    return true;
  }
  return false;
}

/**
 * A message payloadJson
 * @constructor
 * @param {string} name The name of the message
 * @param {number} codecServiceId Service identifier (aka SIN)
 * @param {number} codecMessageId Message type identifier (aka MIN)
 * @param {boolean} isForward Flag indicating a Forward Message
 * @param {Object[]} fields An array of Field objects
 */
function Payload(name, codecServiceId, codecMessageId, isForward, fields) {
  this.name = typeof(name) === 'string' ? name : null;
  this.codecServiceId = isValidCodecId(codecServiceId) ? codecServiceId : null;
  this.codecMessageId = isValidCodecId(codecMessageId) ? codecMessageId : null;
  this.isForward = typeof(isForward) === 'boolean' ? isForward : false;
  this.fields = [];
  if (fields instanceof Array) {
    fields.forEach(field => {
      if (isValidField(field)) { this.fields.push(field) }
    });
  }
}

/* Not applicable unless database requires join to support objects (?)
MessagePayloadJson.prototype = Object.create(Model.prototype);
MessagePayloadJson.prototype.constructor = MessagePayloadJson;
*/

const FIELD_TYPES = [
  'boolean',
  'enum',
  'unsignedint',
  'signedint',
  'string',
  'data',
  'array',
  'dynamic',
  'message',
];

/**
 * A message payloadJson field
 * @constructor
 * @param {string} name 
 * @param {string} dataType 
 * @param {string|Array} value 
 */
function Field(name, dataType, value) {
  this.name = typeof(name) === 'string' ? name : null;
  if (typeof(value) !== 'undefined' && value !== null) {
    if (typeof(value) === 'array') {
      this.elements = value;
    } else {
      if (dataType === 'boolean') {
        this.stringValue = value === true ? "True" : "False";
      } else {
        this.stringValue = String(value);
      }
    }
  } else {
    this.stringValue = null;
    this.elements = null;
  }
  this.dataType = FIELD_TYPES.includes(dataType) ? dataType : null;
}

/**
 * Returns true if the field is valid
 * @private
 * @param {Field} field the field to check
 * @returns {boolean}
 */
function isValidField(field) {
  try {
    if (field instanceof Object && field !== null
        && field.constructor === Field) {
      if (field.name && field.dataType) {
        if (field.dataType === 'array' && field.elements) {
          field.elements.forEach(element => {
            if ('index' in element && 'fields' in element) {
              if (element.fields instanceof Array) {
                element.fields.forEach(field => {
                  if (!isValidField(element)) return false;
                });
              }
            } else {
              return false;
            }
          });
        } else if (field.stringValue
              && typeof(field.stringValue) === 'string') {
          return true;
        } else {
          console.warn(`dataType ${field.dataType} not handled`);
          return false;
        }
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Adds a field to the JSON payload (if valid)
 * @param {Field} field The field to add
 */
Payload.prototype.addField = function(field) {
  if (isValidField(field)) {
    if (!(this.fields instanceof Array)) {
      this.fields = [];
    }
    this.fields.push(field);
  }
}

module.exports = {
  Payload,
  Field,
};
