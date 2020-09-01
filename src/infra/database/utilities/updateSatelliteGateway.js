'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const SatelliteGateway = require('../models/SatelliteGateway');
const gatewayCategory = require('../models/categories.json').satelliteGateway;

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {SatelliteGateway} satelliteGateway The satellite message gateway
 * @returns {boolean} true if state changed from prior
 */
async function updateSatelliteGateway(database, satelliteGateway) {
  let categoryToFind = gatewayCategory;
  let filter = { name: satelliteGateway.name };
  const findGateway = await database.find(categoryToFind, filter);
  if (findGateway.length > 0) {
    let dbGateway = new SatelliteGateway();
    dbGateway.fromDb(findGateway[0]);  // loses id
    dbGateway.id = findGateway[0].id;
    if (dbGateway.alive === null) {
      //no state change this is the first update
    } else if (dbGateway.alive !== satelliteGateway.alive) {
      dbGateway.alive = satelliteGateway.alive;
      dbGateway.aliveChangeTimeUtc = new Date().toISOString();
      let { updatedItem, changeCount } = await database.update(dbGateway.toDb());
      if (changeCount === 0) {
        throw new Error(`Unable to update gateway ${dbGateway.name} in database`);
      }
      return true;
    }
    return false;
  }
  throw new Error(`Satellite Gateway ${satelliteGateway.name} not found in database`);
}

module.exports = updateSatelliteGateway;
