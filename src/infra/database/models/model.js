'use strict';
const logger = require('../../logging').loggerProxy(__filename);
const propertyConversion = require('../utilities/propertyConversion');
const idpApi = require('isatdatapro-api');

/**
 * Model Class prototype
 * @param {string} category 
 */
function Model(category) {
  this.category = category;
}

/**
 * Model Class method to extract from database into the model instance
 * @param {object} dbExtract The database representation of the model
 */
Model.prototype.fromDb = function(dbExtract) {
  const myProperties = Object.getOwnPropertyNames(this);
  myProperties.forEach(modelProp => {
    let dbProp = propertyConversion.toDb(modelProp);
    if (this.hasOwnProperty(modelProp) && dbExtract.hasOwnProperty(dbProp)) {
      let { unused, modelValue } = propertyConversion.fromDb(dbProp, dbExtract[dbProp]);
      this[modelProp] = modelValue;
    }
  });
}

/**
 * Model Class method to prep for database create/update
 * @returns {object} The database representation of the model
 */
Model.prototype.toDb = function() {
  const myProperties = Object.getOwnPropertyNames(this);
  let dbInsert = {};
  myProperties.forEach(modelProp => {
    if (this.hasOwnProperty(modelProp)) {
      let { dbProp, dbValue } = propertyConversion.toDb(modelProp, this[modelProp]);
      dbInsert[dbProp] = dbValue;
    }
  });
  return dbInsert;
}

/**
 * Populates model properties from an API returned dataset
 * @param {object} modelData The API response message object
 */
Model.prototype.populate = async function(modelData) {
  for (let prop in modelData) {
    if (modelData.hasOwnProperty(prop) && this.hasOwnProperty(prop)) {
      this[prop] = modelData[prop];
      if (typeof(this[prop]) === 'undefined') this[prop] = null;
    } else {
      logger.warn(`Model populate ignoring candidate property ${prop}`);
    }
    if (prop === 'errorId') {
      this.error = await idpApi.getErrorName(modelData.errorId);
    }
  }
}

/**
 * Updates entity properties from a partial new model if non-null
 * @param {object} newData The entity new parameters
 */
Model.prototype.updateNonNull = function(newData) {
  for (let prop in newData) {
    if (this.hasOwnProperty(prop) && newData.hasOwnProperty(prop) && newData[prop] !== null) {
      this[prop] = newData[prop];
    }
  }
}

module.exports = Model;
