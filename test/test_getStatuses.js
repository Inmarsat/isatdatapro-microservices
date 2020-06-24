const getStatuses = require('../src/services/getForwardStatuses');
const emitter = require('../src/infra/eventHandler');

const testGetStatuses = async() => {
  try {
    emitter.addListener('ForwardMessageStateChange', (messageId, state, detail) => {
      console.log(`Forward message ${messageId} new state ${state}`);
    });
    emitter.addListener('OtherForwardMessage', (messageId, mailboxId, detail) => {
      console.log(`Another API client submitted message ${messageId} to mailbox ${mailboxId}`);
    });
    await getStatuses(console);
  } catch (err) {
    console.log(err);
  }
};

//testGetStatuses();