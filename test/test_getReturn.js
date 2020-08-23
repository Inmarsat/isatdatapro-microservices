const getMessages = require('../src/services/getReturnMessages');
const events = require('../src/infra/eventHandler').emitter;

const testGetReturn = async() => {
  try {
    events.addListener('NewReturnMessage', (detail) => {
      console.log('New Return Message: ' + JSON.stringify(detail));
    });
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile: ' + JSON.stringify(detail));
    });
    events.addListener('ModemRegistration', (detail) => {
      console.log('New Mobile: ' + JSON.stringify(detail));
    });
    events.addListener('ApiOutage', (detail) => {
      console.log('API Outage: ' + detail);
    });
    events.addListener('ApiRecovery', (detail) => {
      console.log(`API Recovered: ${detail}`);
    });
    await getMessages(console);
  } catch (err) {
    console.log(err);
  }
};

testGetReturn();
