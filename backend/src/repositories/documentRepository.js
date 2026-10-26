const fs = require('node:fs');

const documents = new Map();

function save(document) {
  documents.set(document.id, document);
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);
  return document?.owner === owner ? document : null;
}

function createReadStream(document) {
  return fs.createReadStream(document.storagePath);
}

function removeFile(filePath) {
  return fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

module.exports = { save, findByOwner, findByIdAndOwner, createReadStream, removeFile };