import Entity from './entity';

class MessageGateway extends Entity {
  constructor(name, url='https://api.inmarsat.com/v1/idp/gateway/rest/') {
    super('message_gateway');
    this.id = id;
    this.name = name;
    this.url = url;
    this.isAlive = false;
    this.aliveStateTime = new Date().toISOString();
    this.mailboxes = [];
  }
}