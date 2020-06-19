const getMobiles = require('../src/services/getMobiles');
const messageGatewayName = 'Inmarsat';
const emitter = require('../src/infra/eventHandler');

const testGetMobiles = async() => {
  const req = {
    query: {
      mailbox: "590",
    }
  };
  try {
    emitter.addListener('NewMobile', (detail) => {
      console.log('New Mobile found: ' + detail);
    });
    await getMobiles(console, req);
  } catch (err) {
    console.log(err);
  }
};

//testGetMobiles();
