const getMobiles = require('../src/services/getMobiles');
const messageGatewayName = 'Inmarsat';

const testGetMobiles = async() => {
  const req = {
    query: {
      mailbox: "590",
    }
  };
  try {
    await getMobiles(console, req);
  } catch (err) {
    console.log(err);
  }
};
