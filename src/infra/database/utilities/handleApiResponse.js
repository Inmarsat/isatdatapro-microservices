'use strict';
const logger = require('../../logging').loggerProxy(__filename);
const event = require('../../eventHandler');
const idpApi = require('isatdatapro-api');
const updateSatelliteGateway = require('./updateSatelliteGateway');

/**
 * Updates the ApiCallLog and MessageGateway based on IDP API response
 * Emits ApiError
 * @param {DatabaseContext} database The database context/connection
 * @param {number} errorId The error ID returned by the API call
 * @param {ApiCallLog} apiCallLog An ApiCallLog entity
 * @param {SatelliteGateway} satelliteGateway A SatelliteGateway entity
 * @returns {boolean} true if the response had no errors
 */
async function handleApiResponse(database, errorId,
      apiCallLog, satelliteGateway) {
  if (typeof(errorId) !== 'number') throw new Error(`Invalid errorId`);
  apiCallLog.completed = true;
  satelliteGateway.alive = true;
  await updateSatelliteGateway(database, satelliteGateway, apiCallLog.operation);
  apiCallLog.errorId = errorId;
  if (!apiCallLog.error || apiCallLog.error === '') {
    apiCallLog.error = await idpApi.getErrorName(errorId);
  }
  if (errorId !== 0) {
    logger.error(`IDP API ERROR: ${apiCallLog.error}`);
    event.apiError(apiCallLog.operation, apiCallLog.error);
    return false;
  }
  return true;
}

module.exports = handleApiResponse;
