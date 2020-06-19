'use strict';
const logger = require('../../logger').loggerProxy(__filename);
const emitter = require('../../eventHandler');
const updateSatelliteGateway = require('./updateSatelliteGateway');

/**
 * Determines if the error was an API timeout
 * TODO: event/notification handling
 * @param {Error} err The candidate error
 * @param {SatelliteGateway} idpGateway The SatelliteGateway entity
 * @returns {boolean} true if it was an API timeout
 */
async function handleApiTimeout(err, database, idpGateway) {
  if (err.message.includes('ECONNRESET') || err.message.includes('HTTP 502')) {
    idpGateway.alive = false;
    let newOutage = await updateSatelliteGateway(database, idpGateway);
    if (newOutage) {
      const errMessage = `API server error for ${idpGateway.name}`;
      logger.error(errMessage);
      emitter.emit('ApiOutage', errMessage);
    } else {
      logger.warn(`API still down at ${idpGateway.name}`);
    }
    return true;
  }
  return false;
}

module.exports = handleApiTimeout;
