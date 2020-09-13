'use strict';
const logger = require('../../logging').loggerProxy(__filename);
const { SatelliteGateway } = require('../models');
//const category = require('../models/categories.json').SatelliteGateway;

/**
 * Returns the message gateway system parameters for a given mailbox
 * @param {DatabaseContext} dbContext The database context/connection
 * @param {Mailbox} mailbox A Mailbox entity
 */
async function getMailboxGateway(dbContext, mailbox) {
  //const categoryToFind = category;
  let filter = {
    name: mailbox.satelliteGatewayName,
  };
  const category = SatelliteGateway.prototype.category;
  const findGateway = await dbContext.find(category, filter);
  if (findGateway.length > 0) {
    if (findGateway.length > 1) {
      logger.warn(`Satellite gateway ${mailbox.satelliteGatewayName} duplicates found in database`);
    }
    const satelliteGateway = findGateway[0];
    return satelliteGateway;
  } else {
    throw new Error(`Satellite gateway ${mailbox.satelliteGatewayName} not found in database`);
  }
}

module.exports = getMailboxGateway;
