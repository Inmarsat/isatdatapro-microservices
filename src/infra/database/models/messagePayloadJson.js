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
 * @param {string} name 
 * @param {number} codecServiceId 
 * @param {number} codecMessageId 
 * @param {Array} fields 
 */
function MessagePayloadJson(name, codecServiceId, codecMessageId, fields) {
  this.name = typeof(name) === 'string' ? name : null;
  this.codecServiceId = isValidCodecId(codecServiceId) ? codecServiceId : null;
  this.codecMessageId = isValidCodecId(codecMessageId) ? codecMessageId : null;
  this.fields = fields instanceof Array ? fields : null;
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
 * @param {string} fieldType 
 * @param {string|Array} value 
 */
function Field(name, fieldType, value) {
  this.name = typeof(name) === 'string' ? name : null;
  this.fieldType = FIELD_TYPES.includes(fieldType) ? fieldType : null;
  if (typeof(value) !== 'undefined' && value !== null) {
    if (typeof(value) === 'string') {
      this.stringValue = value;
    } else if (fieldType === 'array') {
      this.elements = value;
    } else {
      this.stringValue = null;
      this.elements = null;
    }
  }
}

/**
 * Returns true if the field is valid
 * @private
 * @param {Field} field the field to check
 * @returns {boolean}
 */
function isValidField(field) {
  try {
    if (field instanceof Object && field !== null && field.constructor === Field) {
      if (field.name && field.fieldType) {
        if (field.fieldType === 'array' && field.elements) {
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
        } else if (field.stringValue && typeof(field.stringValue) === 'string') {
          return true;
        } else {
          console.warn(`fieldType ${field.fieldType} not handled`);
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
MessagePayloadJson.prototype.addField = function(field) {
  if (isValidField(field)) {
    if (!(this.fields instanceof Array)) {
      this.fields = [];
    }
    this.fields.push(field);
  }
}

module.exports = MessagePayloadJson;
