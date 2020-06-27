const addMailbox = require('../src/services/addMailbox');
const addGateway = require('../src/services/addSatelliteGateway');

async function testManage() {
  try {
    for (let mb = 0; mb < testInfra.mailboxes.length; mb++) {
      let req = { body: { mailbox: testInfra.mailboxes[mb] } };
      await addMailbox(console, req);
    }
    for (let gw = 0; gw < testInfra.gateways.length; gw++) {
      let req = { body: { gateway: testInfra.gateways[gw] } };
      await addGateway(console, req);
    }
  } catch (err) {
    console.log(err);
  }
};

const testInfra = require('./testMailboxesGateways');

//testManage();