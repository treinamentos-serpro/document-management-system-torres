const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');

const router = express.Router();
const backendRoot = path.resolve(__dirname, '../..');
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(backendRoot, process.env.STORAGE_DIR)
  : path.join(backendRoot, 'storage');
const configuredFileLimit = Number.parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
const fileSizeLimit = Number.isSafeInteger(configuredFileLimit) && configuredFileLimit > 0
  ? configuredFileLimit
  : 10 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
      });
    },
    filename(req, file, callback) {
      callback(null, crypto.randomUUID());
    },
  }),
  limits: { fileSize: fileSizeLimit, files: 1 },
});
const parseSingleFile = upload.single('file');

function handleUploadParsing(req, res, next) {
  parseSingleFile(req, res, (error) => {
    if (!error) {
      return next();
    }
    if (error instanceof multer.MulterError || error.code) {
      return next(error);
    }

    error.status = 400;
    error.code = 'INVALID_UPLOAD';
    return next(error);
  });
}

router.post(
  '/upload',
  documentController.requireUser,
  handleUploadParsing,
  documentController.upload,
);
router.get('/documents', documentController.requireUser, documentController.list);
router.get(
  '/documents/:id/download',
  documentController.requireUser,
  documentController.download,
);

module.exports = router;