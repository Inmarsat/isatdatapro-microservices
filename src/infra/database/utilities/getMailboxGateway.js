'use strict';
const logger = require('../../logger').loggerProxy(__filename);
const SatelliteGateway = require('../models/satelliteGateway');
const gatewayCategory = require('../models/categories.json').satelliteGateway;

/**
 * Returns the message gateway system parameters for a given mailbox
 * @param {DatabaseContext} dbContext The database context/connection
 * @param {Mailbox} mailbox A Mailbox entity
 */
async function getMailboxGateway(dbContext, mailbox) {
  const categoryToFind = gatewayCategory;
  let filter = {
    name: mailbox.messageGateway,
  };
  const findResults = await dbContext.find(categoryToFind, filter);
  if (findResults.length > 0) {
    if (findResults.length > 1) {
      logger.warn(`Satellite gateway ${mailbox.messageGateway} duplicates found in database`);
    }
    const messageGateway = new SatelliteGateway();
    messageGateway.fromDb(findResults[0]);
    return messageGateway;
  } else {
    throw new Error(`Satellite gateway ${mailbox.messageGateway} not found in database`);
  }
}

module.exports = getMailboxGateway;
