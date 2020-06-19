class Entity {
  constructor(category) {
    this.category = category;
    this.uid = '';
  }

  equals(other) {
    if (other instanceof Entity === false) {
      return false;
    }
    return other.uid ? this.referenceEquals(other.uid) : this === other;
  }

  referenceEquals(uid) {
    if (!this.uid) {
      return this.equals(uid);
    }
    const reference = typeof uid !== 'string' ? uid.toString() : uid;
    return this.uid === reference;
  }

  toString() {
    return this.uid;
  }
}

module.exports = Entity;
