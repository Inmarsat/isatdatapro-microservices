const getMobiles = require('../src/services/getMobiles');
const events = require('../src/infra/eventHandler').emitter;

const testGetMobiles = async(satelliteGateway, mailboxId) => {
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    await getMobiles(satelliteGateway, mailboxId);
  } catch (err) {
    console.log(err);
  }
};

const testMailbox = require('../config/local.settings.json').testMailbox;
testGetMobiles(undefined, testMailbox);
