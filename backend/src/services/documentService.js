const crypto = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocument(owner, file) {
  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
    storagePath: file.path,
  };

  documentRepository.save(document);
  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

function getDocumentDownload(owner, id) {
  const document = documentRepository.findByIdAndOwner(id, owner);
  if (!document) {
    return null;
  }

  return {
    originalName: document.originalName,
    stream: documentRepository.createReadStream(document),
  };
}

function removeUploadedFile(filePath) {
  return documentRepository.removeFile(filePath);
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentDownload,
  removeUploadedFile,
};