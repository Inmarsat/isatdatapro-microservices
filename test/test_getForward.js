const getMessage = require('../src/services/getForwardMessages');
const testMessage = 4188538;

const testGetForward = async() => {
  const req = {
    query: {
      messageId: testMessage,
    }
  };
  try {
    await getMessage(console, req);
  } catch (err) {
    console.log(err);
  }
};
