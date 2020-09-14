'use strict';

const { logger } = require('../../logging');
const { SatelliteGateway } = require('../models');
const event = require('../../eventHandler');

/**
 * Updates the SatelliteGateway entity and checks for state change
 * Emits ApiOutage or ApiRecovery on state change
 * @param {DatabaseContext} database The database context/connection
 * @param {SatelliteGateway} satelliteGateway The satellite message gateway
 * @param {string} [operation] The API operation if triggering the update
 * @returns {boolean} true if state changed from prior
 * @throws {Error} if gateway not found in database
 */
async function updateSatelliteGateway(database, satelliteGateway, operation) {
  let filter = { name: satelliteGateway.name };
  const category = SatelliteGateway.prototype.category;
  const findGateway = await database.find(category, filter);
  if (findGateway.length > 0) {
    const dbGateway = findGateway[0];
    if (dbGateway.alive != satelliteGateway.alive) {
      satelliteGateway.aliveChangeTimeUtc = new Date().toISOString();
      if (satelliteGateway.alive) {
        logger.info(`${operation}: API recovered`
            + ` for ${satelliteGateway.name}`);
        event.apiRecovery(satelliteGateway.name, 
            satelliteGateway.aliveChangeTimeUtc);
      } else {
        logger.info(`${operation}: API outage`
            + ` for ${satelliteGateway.name}`);
        event.apiOutage(satelliteGateway.name, 
            satelliteGateway.aliveChangeTimeUtc);
      }
    }
  }
  return await database.upsert(satelliteGateway);
}

module.exports = updateSatelliteGateway;
