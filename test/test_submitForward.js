const submitMessage = require('../src/services/submitForwardMessages');
const testDevice = require('../config/local.settings.json').testTerminal;
const events = require('../src/infra/eventHandler').emitter;

const testSubmitForward = async(mobileId, message) => {
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    await submitMessage(mobileId, { payloadRaw: message });
  } catch (err) {
    console.log(err);
  }
};

testSubmitForward(testDevice, [0, 72]);