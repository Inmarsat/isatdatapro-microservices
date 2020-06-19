'use strict';
const logger = require('../../logger').loggerProxy(__filename);
const emitter = require('../../eventHandler/emitter');
const idpApi = require('isatdatapro-api');
const updateSatelliteGateway = require('./updateSatelliteGateway');

/**
 * Updates the ApiCallLog and MessageGateway based on IDP API response
 * TODO: triggers recovery notification if MGS was previously not alive
 * @param {DatabaseContext} database The database context/connection
 * @param {number} errorId The error ID returned by the API call
 * @param {ApiCallLog} apiCallLog An ApiCallLog entity
 * @param {SatelliteGateway} idpGateway A SatelliteGateway entity
 * @returns {boolean} true if the response had no errors
 */
async function handleApiResponse(database, errorId, apiCallLog, idpGateway) {
  if (typeof(errorId) !== 'number') throw new Error(`Invalid errorId`);
  apiCallLog.completed = true;
  idpGateway.alive = true;
  let apiRecovered = await updateSatelliteGateway(database, idpGateway);
  if (apiRecovered) {
    logger.info(`${apiCallLog.operation}: API recovered for ${idpGateway.name}`);
    // TODO notify recovery
    emitter.emit('ApiRecovery', `API recovered for ${idpGateway.name}`);
  }
  apiCallLog.errorId = errorId;
  apiCallLog.error = await idpApi.getErrorName(errorId);
  if (errorId !== 0) {
    logger.warn(`API ERROR: ${apiCallLog.error}`);
    return false;
  }
  return true;
}

module.exports = handleApiResponse;
