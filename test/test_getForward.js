const getMessage = require('../src/services/getForwardMessages');
const emitter = require('../src/infra/eventHandler');

const testGetForward = async(testMessage) => {
  const req = {
    query: {
      messageId: testMessage,
    }
  };
  try {
    emitter.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    emitter.addListener('NewForwardMessage', (detail) => {
      console.log('New Forward message: ' + detail);
    });
    await getMessage(console, req);
  } catch (err) {
    console.log(err);
  }
};

//testGetForward();
