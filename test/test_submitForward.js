const submitMessage = require('../src/services/submitForwardMessages');
const testDevice = require('../config/local.settings.json').testTerminal;
const emitter = require('../src/infra/eventHandler');

const testSubmitForward = async() => {
  const req = {
    body: {
      mobileId: testDevice,
      payloadRaw: [0, 72],
    }
  };
  try {
    emitter.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    await submitMessage(console, req);
  } catch (err) {
    console.log(err);
  }
};

//testSubmitForward();