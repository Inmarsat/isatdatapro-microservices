'use strict';

/**
 * Returns the interpreted value of the field based on dataType
 * @param {object} field A payload field { name, value, dataType }
 */
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

module.exports = parseFieldValue;