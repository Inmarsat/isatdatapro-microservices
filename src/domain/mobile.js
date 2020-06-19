import Entity from './entity';

class Mobile extends Entity {
  constructor(id, name, mailbox) {
    super('message_gateway');
    this.id = id;
    this.name = name;
    this.mailbox = mailbox;
    this.lastRegistrationTimeUtc = '';
  }
}