const getStatuses = require('../src/services/getForwardStatuses');
const events = require('../src/infra/eventHandler').emitter;

const testGetStatuses = async() => {
  try {
    events.addListener('ForwardMessageStateChange', (messageId, state, detail) => {
      console.log(`Forward message ${messageId} new state ${state}`);
    });
    events.addListener('OtherForwardMessage', (messageId, mailboxId, detail) => {
      console.log(`Another API client submitted message ${messageId} to mailbox ${mailboxId}`);
    });
    await getStatuses(console);
  } catch (err) {
    console.log(err);
  }
};

testGetStatuses();