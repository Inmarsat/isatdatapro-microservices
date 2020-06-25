'use strict';
const logger = require('../../logging').loggerProxy(__filename);
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
    name: mailbox.satelliteGatewayName,
  };
  const findResults = await dbContext.find(categoryToFind, filter);
  if (findResults.length > 0) {
    if (findResults.length > 1) {
      logger.warn(`Satellite gateway ${mailbox.satelliteGatewayName} duplicates found in database`);
    }
    const satelliteGateway = new SatelliteGateway();
    satelliteGateway.fromDb(findResults[0]);
    return satelliteGateway;
  } else {
    throw new Error(`Satellite gateway ${mailbox.satelliteGatewayName} not found in database`);
  }
}

module.exports = getMailboxGateway;
