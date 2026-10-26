const documentService = require('../services/documentService');

function requireUser(req, res, next) {
  const userId = req.get('X-User-Id')?.trim();
  if (!userId) {
    return res.status(400).json({
      error: {
        code: 'INVALID_USER_CONTEXT',
        message: 'O cabeçalho X-User-Id é obrigatório.',
      },
    });
  }

  req.userId = userId;
  next();
}

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo file.' },
    });
  }

  try {
    const document = documentService.createDocument(req.userId, req.file);
    return res.status(201).json(document);
  } catch (error) {
    await documentService.removeUploadedFile(req.file.path);
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.json(documentService.listDocuments(req.userId));
  } catch (error) {
    return next(error);
  }
}

async function download(req, res, next) {
  try {
    const download = documentService.getDocumentDownload(req.userId, req.params.id);
    if (!download) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
    }

    download.stream.on('error', (error) => {
      if (res.headersSent) {
        return res.destroy(error);
      }
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Documento não encontrado.',
          },
        });
      }
      return next(error);
    });

    res.attachment(download.originalName);
    res.type('application/octet-stream');
    return download.stream.pipe(res);
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireUser, upload, list, download };