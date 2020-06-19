const submitMessage = require('../src/services/submitForwardMessages');
const testDevice = require('../config/local.settings.json').testTerminal;

const testSubmitForward = async() => {
  const req = {
    body: {
      mobileId: testDevice,
      payloadRaw: [0, 72],
    }
  };
  try {
    await submitMessage(console, req);
  } catch (err) {
    console.log(err);
  }
};
