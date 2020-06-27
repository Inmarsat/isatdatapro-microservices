'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');
const SatelliteGateway = require('../infra/database/models/satelliteGateway');

module.exports = async function (context, req) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  try {
    logger.debug(`${thisFunction.name} http triggered at ${callTime}`);
    let responseText = '';
    if (req.body && req.body.gateway) {
      const gatewayDetail = req.body.gateway;
      if (typeof(gatewayDetail.name) === 'string' &&
          typeof(gatewayDetail.url) === 'string') {
        //: valid definition
        let gateway = new SatelliteGateway(
          gatewayDetail.name,
          gatewayDetail.url
        );
        let uniFilter = { name: gateway.name };
        let { id , changeList, created } = await database.upsert(gateway.toDb(), uniFilter);
        //TODO: validate auth/connectivity using getMobiles;
        if (created) {
          responseText += `<br>Added gateway ${gateway.name} to database`;
        } else {
          responseText += `<br>Changes to gateway ${gateway.name}: ${JSON.stringify(changeList)}`;
        }
      }
    }
    if (responseText !== '') {
      context.res = {
        status: 200,
        body: responseText,
      };
    } else {
      context.res = {
        status: 401,
        body: `Invalid input`
      };
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}