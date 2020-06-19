import Entity from './entity';

class Mailbox extends Entity {
  constructor(id, name, accessId, encodedPassword, messageGateway='inmarsat') {
    super('mailbox');
    this.id = id;
    this.name = name;
    this.accessId = accessId;
    this.encodedPassword = encodedPassword;
    this.messageGateway = messageGateway;
  }
}

module.exports = Mailbox;
