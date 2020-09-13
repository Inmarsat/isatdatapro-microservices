'use strict';

const { logger } = require('../../logging');
//const logger = require('../../logging').loggerProxy(__filename);
const { SatelliteGateway } = require('../models');

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {SatelliteGateway} satelliteGateway The satellite message gateway
 * @returns {boolean} true if state changed from prior
 * @throws {Error} if gateway not found in database
 */
async function updateSatelliteGateway(database, satelliteGateway) {
  let filter = { name: satelliteGateway.name };
  const category = SatelliteGateway.prototype.category;
  const findGateway = await database.find(category, filter);
  if (findGateway.length > 0) {
    const dbGateway = findGateway[0];
    if (dbGateway.alive !== satelliteGateway.alive) {
      dbGateway.alive = satelliteGateway.alive;
      dbGateway.aliveChangeTimeUtc = new Date().toISOString();
      try {
        const res = await database.upsert(dbGateway);
        return true;
      } catch (e) {
        logger.error(e);
      }
    }
    return false;
  }
  throw new Error(`Satellite Gateway ${satelliteGateway.name} not found in database`);
}

module.exports = updateSatelliteGateway;
