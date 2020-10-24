/**
 * getEntity module
 * @module getEntity
 */
'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');

/**
 * Retrieves all entity metadata for the given model and filter criteria
 * 
 * @param {string} category The category/type of the model
 * @param {Object} [filter] A set of filter criteria
 * @param {Object} [filter.include] Filters to include
 * @param {Object} [filter.exclude] Filters to exclude
 * @param {Object} [filter.options] Additional options
 * @param {number} [filter.limit] Maximum quantity to return
 * @param {string} [filter.desc] Property name for sort descending
 * @param {string} [filter.asc] Property name for sort ascending
 */
module.exports = async function(category, filter) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  if (!category || typeof(category) !== 'string') {
    throw new Error(`Invalid model type ${category}`);
  }
  const database = new DatabaseContext();
  switch (category) {
    case 'ApiCallLog':
      category = 'api_call_log';
      break;
    case 'Mailbox':
      category = 'mailbox';
      break;
    case 'MessageForward':
      category = 'message_forward';
      break;
    case 'MessageReturn':
      category = 'message_return';
      break;
    case 'Mobile':
      category = 'mobile';
      break;
    case 'SatelliteGateway':
      category = 'satellite_gateway';
      break;
  }
  let entities;
  try {
    await database.initialize();
    entities = await database.find(
        category, filter.include, filter.exclude, filter.options);
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
    return entities;
  }
}