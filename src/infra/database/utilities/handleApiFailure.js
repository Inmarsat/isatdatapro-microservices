'use strict';
const logger = require('../../logging').loggerProxy(__filename);
const event = require('../../eventHandler');
const updateSatelliteGateway = require('./updateSatelliteGateway');

/**
 * Determines if the error was an API timeout
 * TODO: event/notification handling
 * @param {Error} err The candidate error
 * @param {SatelliteGateway} satelliteGateway The SatelliteGateway entity
 * @returns {boolean} true if API endpoint is known unavailable
 */
async function handleApiFailure(err, database, satelliteGateway) {
  if (err.message.includes('ECONNRESET') || err.message.includes('HTTP 502')) {
    satelliteGateway.alive = false;
    let newOutage = await updateSatelliteGateway(database, satelliteGateway);
    if (newOutage) {
      const errMessage = `API server error for ${satelliteGateway.name}`;
      logger.error(errMessage);
      event.apiOutage(satelliteGateway.name, new Date().toISOString());
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
