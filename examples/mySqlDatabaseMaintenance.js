'use strict';

const DatabaseContext = require('../src/infra/database/repositories/mysqlRepository');
const CLEANUP_INTERVAL_HOURS = 24;

async function removeAged() {
  const database = new DatabaseContext();
  await database.initialize();
  await database.removeAged();
  await database.close();
}

(async () => {
  await removeAged();
  setInterval(async function() {
    await removeAged();
  }, CLEANUP_INTERVAL_HOURS * 3600 * 1000);
})();
