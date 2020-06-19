const getMessages = require('../src/services/getReturnMessages');
const emitter = require('../src/infra/eventHandler/emitter');

const testGetReturn = async() => {
  try {
    emitter.addListener('NewReturnMessage', (detail) => {
      console.log('New Return Message: ' + detail);
    });
    emitter.addListener('NewMobile', (detail) => {
      console.log('New Mobile: ' + detail);
    });
    emitter.addListener('ApiOutage', (detail) => {
      console.log('API Outage: ' + detail);
    });
    emitter.addListener('ApiRecovery', (detail) => {
      console.log(`API Recovered: ${detail}`);
    });
    await getMessages(console);
  } catch (err) {
    console.log(err);
  }
};

//testGetReturn();
