'use strict';
//const logger = require('../../logging').loggerProxy(__filename);
const { SatelliteGateway } = require('../models');
//const category = require('../models/categories.json').SatelliteGateway;

/**
 * Returns the Mailbox entity for a given Mobile
 * @param {DatabaseContext} database The database context/connection
 * @param {SatelliteGateway} satelliteGateway The satellite message gateway
 * @returns {boolean} true if state changed from prior
 */
async function updateSatelliteGateway(database, satelliteGateway) {
  //let categoryToFind = category;
  let filter = { name: satelliteGateway.name };
  const category = SatelliteGateway.prototype.category;
  const findGateway = await database.find(category, filter);
  if (findGateway.length > 0) {
    //let dbGateway = new SatelliteGateway();
    //dbGateway.fromDb(findGateway[0]);  // loses id
    //dbGateway.id = findGateway[0].id;
    const dbGateway = findGateway[0];
    if (dbGateway.alive === null) {
      //no state change this is the first update
    } else if (dbGateway.alive !== satelliteGateway.alive) {
      dbGateway.alive = satelliteGateway.alive;
      dbGateway.aliveChangeTimeUtc = new Date().toISOString();
      let { changeCount } = await database.upsert(dbGateway.toDb());
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
