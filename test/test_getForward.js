const getMessage = require('../src/services/getForwardMessages');
const events = require('../src/infra/eventHandler').emitter;

const testGetForward = async(testMessage, mailboxId) => {
  /*
  const req = {
    query: {
      messageId: testMessage,
    }
  };
  if (mailboxId) {
    req.query.mailboxId = mailboxId;
  }
  */
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    events.addListener('NewForwardMessage',
        (messageId, mobileId, mailboxId, source) => {
      console.log(`Forward messageId: ${messageId} to ${mobileId}`);
    });
    await getMessage(String(mailboxId), [testMessage]);
  } catch (err) {
    console.log(err);
  }
};

const testMessageId = require('../config/local.settings.json').testFwdId;
const testMailbox = require('../config/local.settings.json').testMailbox;
testGetForward(testMessageId, testMailbox);
