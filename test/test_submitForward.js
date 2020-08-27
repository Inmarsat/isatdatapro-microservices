const submitMessage = require('../src/services/submitForwardMessages');
const testDevice = require('../config/local.settings.json').testTerminal;
const events = require('../src/infra/eventHandler').emitter;

const testSubmitForward = async(mobileId, message) => {
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    let submission;
    if (message instanceof Array) {
      submission = { payloadRaw: message };
    } else if (typeof message === 'object' && 'command' in message) {
      if ('command' in message) {
        submission = { modemCommand: message };
      } else {
        submission = { payloadJson: message };
      }
    }
    await submitMessage(mobileId, submission);
  } catch (err) {
    console.log(err);
  }
};

//testSubmitForward(testDevice, [0, 72]);
const modemCommand = {
  command: 'ping',
  params: null,
};
testSubmitForward(testDevice, modemCommand);