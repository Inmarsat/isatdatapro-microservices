'use strict';

const logger = require('../infra/logging').loggerProxy(__filename);
const DatabaseContext = require('../infra/database/repositories');
const Mailbox = require('../infra/database/models/mailbox');

module.exports = async function (context, req) {
  const thisFunction = {name: logger.getModuleName(__filename)};
  logger.debug(`>>>> ${thisFunction.name} entry`);
  const callTime = new Date().toISOString();
  const database = new DatabaseContext();
  await database.initialize();

  try {
    logger.debug(`${thisFunction.name} http triggered at ${callTime}`);
    let responseText = '';
    if (req.body && req.body.mailbox) {
      const mailboxDetail = req.body.mailbox;
      if (typeof(mailboxDetail.id) === 'string' &&
          typeof(mailboxDetail.name) === 'string' &&
          typeof(mailboxDetail.accessid) === 'string' &&
          typeof(mailboxDetail.password) === 'string' &&
          typeof(mailboxDetail.gateway) === 'string') {
        //: valid definition
        let mailbox = new Mailbox(
          mailboxDetail.id,
          mailboxDetail.name,
          mailboxDetail.accessid,
          mailboxDetail.password,
          mailboxDetail.gateway
        );
        let uniFilter = { mailboxId: mailbox.mailboxId };
        let { id , changeList, created } = await database.upsert(mailbox.toDb(), uniFilter);
        //TODO: validate auth/connectivity using getMobiles;
        if (created) {
          responseText += `<br>Added mailbox ${mailbox.mailboxId} to database`;
        } else {
          responseText += `<br>Changes to mailbox ${mailbox.mailboxId}: ${JSON.stringify(changeList)}`;
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