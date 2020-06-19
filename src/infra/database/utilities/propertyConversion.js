'use strict';
//const logger = require('../../logger').loggerProxy(__filename);

/**
 * Converts camelCase to snake_case
 * @private
 * @param {string} propName The property name in camelCase
 */
function camelToSnakeCase_(propName) {
  let snake_case = propName;
  ///*  Comment out to enable
  snake_case = propName.replace(/([A-Z])/g, ($1) => {
    return '_' + $1.toLowerCase();
  });
  //*/
  return snake_case;
}

/**
 * Converts snake_case to camelCase
 * @private
 * @param {string} propName The property name in snake_case
 */
function snakeToCamelCase_(propName) {
  let camelCase = propName;
  ///*  Comment out to enable
  camelCase = propName.replace(/([_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('_', '');
  });
  //*/
  return camelCase;
}

/**
 * Converts a property and optionally its value to database-compatible
 * @param {string} modelProp The model property
 * @param {any} [modelValue] Optional property value
 * @returns {string|object} if modelValue is present returns {dbProp, dbValue}
 */
function toDb(modelProp, modelValue) {
  let dbProp = camelToSnakeCase_(modelProp);
  if (typeof(modelValue) !== 'undefined') {
    let dbValue = modelValue;
    if (modelValue instanceof Array || modelValue instanceof Object) {
      dbValue = JSON.stringify(modelValue);
    }
    return { dbProp, dbValue };
  }
  return dbProp;
}

/**
 * Converts database-compatible to model property and optionally its value
 * @param {string} dbProp The property name/key from the database
 * @param {any} [value] Optional value stored in the database
 * @returns {string|object} if value is present returns {property, value}
 */
function fromDb(dbProp, dbValue) {
  let modelProp = snakeToCamelCase_(dbProp);
  if (typeof(dbValue) !== 'undefined') {
    let modelValue = dbValue;
    if (typeof(dbValue) === 'string') {
      try {
        modelValue = JSON.parse(dbValue);
        if (modelProp === 'mailboxId') modelValue = String(modelValue);
      } catch (err) {
        if (err.message.includes('JSON')) {
          //: modelValue = dbValue
        } else {
          throw err;
        }
      }
    }
    return { modelProp, modelValue };
  }
  return modelProp;
}

/**
 * Returns a database-compatible filter for queries
 * @param {object} filter A filter key/value set
 * @returns {object} the database-compatible filter
 */
function dbFilter(filter) {
  let newFilter = {};
  for (let param in filter) {
    if (!filter.hasOwnProperty(param)) continue;
    let dbName = toDb(param);
    newFilter[dbName] = filter[param];
  }
  return newFilter;
}

module.exports = { toDb, fromDb, dbFilter };
