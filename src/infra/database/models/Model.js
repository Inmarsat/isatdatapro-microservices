'use strict';

const logger = require('../../logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');

/**
 * Model Class prototype
 * @param {string} category 
 */
function Model(category) {
  this.category = category;
}

/**
 * Populates model properties from an API returned dataset
 * @param {object} modelData The API response message object
 */
Model.prototype.fromApi = async function(modelData) {
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

module.exports = Model;
