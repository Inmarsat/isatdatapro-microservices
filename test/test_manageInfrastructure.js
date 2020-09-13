const addMailbox = require('../src/services/updateMailbox');
const addGateway = require('../src/services/updateSatelliteGateway');

async function testManage() {
  try {
    for (let mb = 0; mb < testInfra.mailboxes.length; mb++) {
      //let req = { body: { mailbox: testInfra.mailboxes[mb] } };
      await addMailbox(testInfra.mailboxes[mb]);
    }
    for (let gw = 0; gw < testInfra.gateways.length; gw++) {
      //let req = { body: { gateway: testInfra.gateways[gw] } };
      await addGateway(testInfra.gateways[gw]);
    }
  } catch (err) {
    console.log(err);
  }
};

const testInfra = require('./_private_testMailboxesGateways');

//testManage();