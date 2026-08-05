const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// generate a random 32 byte data encryption key
const generateDek = () => {
    return crypto.randomBytes(32);
}

// encypt plaintext using a DEK with AES-256-GCM
// return ciphertext, IV, authentication tag
const encryptData = (plaintext, dek) => {
    //generate inital vector of size 12 bytes (recommended size for GCM mode)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // the auth tag guarantees integrity and authenticity
    const tag = cipher.getAuthTag();

    return {
        ciphertext,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
    };
}

// decrypt ciphertext back to plaintext using the DEK, iv, and auth tag
const decryptData = (ciphertext, iv, tag, dek) => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.isBuffer(dek) ? dek : Buffer.from(dek, 'hex'),
        Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
}

// encrypt DEK using the master Key Encryption Key (kek)
// this creates the envelope around the key
const encryptDek = (dek, kek) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(kek, 'hex'), iv);

    let encryptedDek = cipher.update(dek);
    encryptedDek = Buffer.concat([encryptedDek, cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        encryptedDek: encryptedDek.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
    };
}

// decrypt the encrypted dek using master kek
const decryptDek = (encryptedDekHex, ivHex, tagHex, kek) => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(kek, 'hex'),
        Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    let dek = decipher.update(Buffer.from(encryptedDekHex, 'hex'));
    dek = Buffer.concat([dek, decipher.final()]);

    return dek;
}

module.exports = { generateDek, encryptData, decryptData, encryptDek, decryptDek };