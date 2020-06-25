'use strict';
require('dotenv').config();
const crypto = require('crypto');
const algorithmOld = 'aes-256-cbc';
const algorithm = 'aes-256-ctr';
const IV_LENGTH = 16;
const key = process.env.CRYPTO_KEY;
const cipherMethod = process.env.CIPHER_METHOD || 'deprecated';

/**
 * Encrypts a string using AES-256
 * @param {string} text The text to encrypt
 * @returns {string} encrypted text (hex)
 */
function encrypt(text){
  if (text.length === 0 || typeof(key) === 'undefined') return text;
  if (cipherMethod === 'deprecated') {
    const cipherOld = crypto.createCipher(algorithmOld, key)
    let encryptedOld = cipherOld.update(text,'utf8','hex')
    encryptedOld += cipherOld.final('hex');
    return encryptedOld;
  }
  let iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}
 
/**
 * Decrypts an AES-256 encrypted string
 * @param {string} text The text to decrypt
 * @returns {string} decrypted text (utf8)
 */
function decrypt(text){
  if (text.length === 0 || typeof(key) === 'undefined') return text;
  if (cipherMethod === 'deprecated') {
    const decipherOld = crypto.createDecipher(algorithmOld, key)
    let decryptedOld = decipherOld.update(text,'hex','utf8')
    decryptedOld += decipherOld.final('utf8');
    return decryptedOld;
  }
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  return decrypted;
}
 
module.exports = { encrypt, decrypt };
