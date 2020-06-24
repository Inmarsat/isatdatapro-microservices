const getMobiles = require('../src/services/getMobiles');
const messageGatewayName = 'Inmarsat';
const events = require('../src/infra/eventHandler').emitter;

const testGetMobiles = async() => {
  const req = {
    query: {
      mailbox: "590",
    }
  };
  try {
    events.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    await getMobiles(console, req);
  } catch (err) {
    console.log(err);
  }
};

//testGetMobiles();
