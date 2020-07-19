'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');
const SatelliteGateway = require('../infra/database/models/satelliteGateway');

/**
 * 
 * @param {object} gatewayParameters 
 */
module.exports = async function (gatewayParameters) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  try {
    if (typeof(gatewayParameters.name) === 'string' &&
        typeof(gatewayParameters.url) === 'string') {
      //: valid definition
      let gateway = new SatelliteGateway(
        gatewayParameters.name,
        gatewayParameters.url
      );
      let uniFilter = { name: gateway.name };
      let { id , changeList, created } = await database.upsert(gateway.toDb(), uniFilter);
      //TODO: validate auth/connectivity using getMobiles;
      if (created) {
        logger.debug(`Added satellite gateway ${gateway.name} to database (${id})`);
      } else {
        logger.debug(`Changes to satellite gateway ${gateway.name}: ${JSON.stringify(changeList)}`);
      }
    } else {
      throw new Error('Invalid satellite gateway parameters');
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}