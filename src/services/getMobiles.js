'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const idpApi = require('isatdatapro-api');
const DatabaseContext = require('../infra/database/repositories');
const dbUtilities = require('../infra/database/utilities');
const ApiCallLog = require('../infra/database/models/apiCallLog');
const Mobile = require('../infra/database/models/mobile');
const event = require('../infra/eventHandler');

module.exports = async function(satelliteGatewayName, mailboxId) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  const MAX_MOBILES = 1000;
  await database.initialize();

  async function getMobiles(mailbox, nextMobileId) {
    const operation = 'getMobiles';
    const idpGateway = await dbUtilities.getMailboxGateway(database, mailbox);
    const auth = {
      accessId: mailbox.accessId,
      password: mailbox.passwordGet(),
    };
    let filter = { pageSize: MAX_MOBILES };
    if (nextMobileId) { filter.mobileId = nextMobileId }
    const callTimeUtc = new Date().toISOString();
    let apiCallLog = new ApiCallLog(operation, idpGateway.name, mailbox.mailboxId, callTimeUtc);
    await Promise.resolve(idpApi.getMobileIds(auth, filter, idpGateway.url))
    .then(async function (result) {
      //logger.debug(`${operation} result: ${JSON.stringify(result)}`);
      let success = await dbUtilities.handleApiResponse(database, result.errorId, apiCallLog, idpGateway);
      if (success) {
        if (result.mobiles.length > 0) {
          logger.debug(`Found ${result.mobiles.length} mobiles for mailbox ${mailbox.mailboxId}`);
          if (result.mobiles.length === MAX_MOBILES) {
            nextMobileId = result.mobiles[MAX_MOBILES-1].mobileId;
          } else {
            nextMobileId = null;
          }
          for (let m = 0; m < result.mobiles.length; m++) {
            let mobile = new Mobile();
            await mobile.populate(result.mobiles[m]);
            mobile.mailboxId = mailbox.mailboxId;
            let mobileFilter = { mobileId: mobile.mobileId };
            let { id: id, created: created } = await database.upsert(mobile.toDb(), mobileFilter);
            //let id = await database.exists(mobile.toDb(), mobileFilter);
            if (!created) {
              logger.debug(`Updating mobile ${mobile.mobileId} (${id})`);
            } else {
              logger.debug(`Added mobile ${mobile.mobileId} to database (${id})`);
              event.newMobile(mobile);
            }
          }
        } else {
          logger.warn(`No mobiles found for mailbox ${mailbox.mailboxId}`);
        }
      }
    })
    .catch(async (err) => {
      //TODO: handle promise error more elegantly
      // e.g. alert on API non-response or 500
      let apiOutage = await dbUtilities.handleApiFailure(err, database, idpGateway);
      if (!apiOutage) {
        logger.error(err);
        throw err;
      }
    });
    await database.create(apiCallLog.toDb());
    if (typeof(nextMobileId) === 'string') {
      await getMobiles(mailbox, nextMobileId);
    }
  }

  try {
    logger.info(`${thisFunction.name} called at ${callTime}`);
    // TODO: first filter on mailbox then on gateway
    /*
    let filterMailbox;
    let filterGateway;
    if (req.query) {
      if (req.query.mailbox) {
        filterMailbox = req.query.mailbox;
      } else if (req.query.gateway) {
        filterGateway = req.query.gateway;
      }
    }*/
    let mailboxes = await dbUtilities.getMailboxes(database, satelliteGatewayName, mailboxId);
    if (mailboxes instanceof Array) {
      for (let m = 0; m < mailboxes.length; m++) {
        await getMobiles(mailboxes[m])
      }
    } else if (typeof(mailboxes) !== 'undefined') {
      await getMobiles(mailboxes);
    } else {
      logger.warn(`Mailbox not found matching mailboxId=${filterMailbox} or satelliteGateway=${filterGateway}`);
    }
  } catch (err) {
    logger.error(err.stack);
    throw err;
  } finally {
    await database.close();
    logger.debug(`<<<< ${thisFunction.name} exit`);
  }
}