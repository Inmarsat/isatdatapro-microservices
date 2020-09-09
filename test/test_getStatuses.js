const getStatuses = require('../src/services/getForwardStatuses');
const getForwardMessage = require('../src/services/getForwardMessages');
const events = require('../src/infra/eventHandler').emitter;

const testGetStatuses = async() => {
  try {
    events.addListener('ForwardMessageStateChange', (messageId, mobileId, state, detail) => {
      console.log(`Forward message ${messageId} to ${mobileId}: ${state} (${detail})`);
    });
    events.addListener('OtherClientForwardSubmission', async (messageId, mailboxId) => {
      console.log(`Another API client submitted message ${messageId} to mailbox ${mailboxId}`);
      await getForwardMessage(mailboxId, messageId);
    });
    await getStatuses(console);
  } catch (err) {
    console.log(err);
  }
};

testGetStatuses();