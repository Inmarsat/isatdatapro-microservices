'use strict';

const logger = require('../../logging').loggerProxy(__filename);
//const event = require('../../eventHandler');
const updateSatelliteGateway = require('./updateSatelliteGateway');

/**
 * Determines if the error was an API timeout
 * Emits event ApiOutage
 * @param {Error} err The candidate error
 * @param {DatabaseContext} database The database to update
 * @param {SatelliteGateway} satelliteGateway The SatelliteGateway entity
 * @param {string} [operation] The API operation that failed
 * @returns {boolean} true if API endpoint is known unavailable
 */
async function handleApiFailure(database, err, satelliteGateway, operation) {
  if (err.message.includes('ECONNRESET') || err.message.includes('HTTP 502')) {
    satelliteGateway.alive = false;
    const { changeList } =
        await updateSatelliteGateway(database, satelliteGateway, operation);
    if (changeList && changeList.alive) {
      const errMessage = `API server error for ${satelliteGateway.name}`;
      logger.error(errMessage);
      //event.apiOutage(satelliteGateway.name, new Date().toISOString());
    } else {
      logger.warn(`API still down at ${satelliteGateway.name}`);
    }
    return true;
  } else if (err.message.includes('EPROTO')) {
    logger.error(`Suspected Nodejs/TLS incompatibility check versions`);
  }
  return false;
}

module.exports = handleApiFailure;
