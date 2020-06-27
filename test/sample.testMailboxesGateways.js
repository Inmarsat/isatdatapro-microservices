'use strict';

const gwIsat = {
  name: 'Inmarsat',
  url: 'https://api.inmarsat.com/v1/idp/gateway/rest/',
};

const myMailbox = {
  id: '000',
  name: 'myMailbox',
  accessid: 'abc123',
  password: 'password',
  gateway: 'Inmarsat',
};

module.exports = {
  gateways: [gwIsat],
  mailboxes: [myMailbox]
};