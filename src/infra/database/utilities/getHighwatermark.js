'use strict';
const logger = require('../../logging').loggerProxy(__filename);
const ApiCallLog = require('../models/ApiCallLog');
const apiCallLogCategory = require('../models/categories.json').apiCallLog;
const propertyConversion = require('./propertyConversion');

/**
 * Returns the high water mark from the most recent IDP Messaging API call
 * @param {DatabaseContext} dbContext The database client/connection
 * @param {string} mailboxId The mailbox id the operation was made against
 * @param {string} operation The api operation
 * @returns {object} { nextStartTimeUtc, [nextStartId] }
 */
async function getHighwatermark(dbContext, mailboxId, operation) {
  const SUPPORTED_OPERATIONS = [
    'getReturnMessages',
    'getForwardStatuses',
  ];
  if (!(SUPPORTED_OPERATIONS.includes(operation))) {
    throw new Error(`Invalid operation must be one of ${SUPPORTED_OPERATIONS}`);
  }
  let apiFilter = {};
  let queryFilter = {
    operation: operation,
    mailboxId: mailboxId,
    completed: true,
  };
  queryFilter = propertyConversion.dbFilter(queryFilter);
  const options = {
    limit: 1,
    desc: '_ts',
  };
  const apiCalls = await dbContext.find(apiCallLogCategory, queryFilter, options);
  if (apiCalls.length > 0) {
    //
    let lastCall = new ApiCallLog();
    lastCall.fromDb(apiCalls[0]);
    if (lastCall.nextStartId > 0) {
      apifilter.startMessageId = lastCall.nextStartId;
      logger.debug(`Found next start ID ${apiFilter.startMessageId}`
                + ` for mailbox ${mailboxId} as filter`);
    } else if (lastCall.nextStartTimeUtc !== '') {
      apiFilter.startTimeUtc = lastCall.nextStartTimeUtc;
      logger.debug(`Found next start time ${apiFilter.startTimeUtc}`
                + ` for mailbox ${mailboxId} as filter`);
    }
  }
  if (!(apiFilter.startTimeUtc) && !(apiFilter.startMessageId)) {
    let date = new Date();
    date.setUTCHours(date.getUTCHours() - 48);
    apiFilter.startTimeUtc = date.toISOString();
    logger.debug(`No previous filter found for mailbox ${mailboxId} - using`
        + ` ${apiFilter.startTimeUtc}`);
  }
  return apiFilter;
}

module.exports = getHighwatermark;
