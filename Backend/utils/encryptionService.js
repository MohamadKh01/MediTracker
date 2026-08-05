const { generateDek, encryptData, decryptData, encryptDek, decryptDek } = require('./encryption');

const KEK = process.env.ENCRYPTION_KEK

// Encrypt an object into a document envelope format
const encryptDocumentPayload = (dataObject) => {
    if (!KEK) {
        throw new Error('ENCRYPTION KEK is missing');
    }

    const plaintext = JSON.stringify(dataObject);

    // generate a fresh DEK for this specific document
    const dek = generateDek();

    // encrypt the payload using the dek
    const encrypted = encryptData(plaintext, dek);

    // encrypt the dek using the master kek
    const wrappedDek = encryptDek(dek, KEK);

    return {
        encryptedPayload: encrypted.ciphertext,
        payloadIV: encrypted.iv,
        payloadTag: encrypted.tag,
        payloadDek: wrappedDek.encryptedDek,
        payloadDekIv: wrappedDek.iv,
        payloadDekTag: wrappedDek.tag
    };
}

// decrypt the dek and the document envelope back into js object
const decryptDocumentPayload = (doc) => {
    if (!KEK) {
        throw new Error('ENCRYPTION KEK is missing');
    }
    // decrypt the dek using the master kek
    const dek = decryptDek(doc.payloadDek, doc.payloadDekIv, doc.payloadDekTag, KEK);

    // decrypt the payload ciphertext using the dek
    const plaintext = decryptData(doc.encryptedPayload, doc.payloadIv, doc.payloadTag, dek);

    // parse back into a JSON object
    return JSON.parse(plaintext);
};

module.exports = { encryptDocumentPayload, decryptDocumentPayload };
