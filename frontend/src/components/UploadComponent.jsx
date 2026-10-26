import { useRef, useState } from 'react';
import formatFileSize from '../services/formatFileSize.js';

export default function UploadComponent({ onUpload }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  function selectFile(event) {
    setFile(event.target.files?.[0] || null);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      await onUpload(file);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  function clearFile() {
    setFile(null);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <form className="upload-form" onSubmit={submit}>
      <label className={`file-picker${file ? ' file-picker--selected' : ''}`} htmlFor="document-file">
        <span className="upload-symbol" aria-hidden="true">↑</span>
        <span className="file-picker-copy">
          <strong>{file ? 'Trocar arquivo' : 'Selecionar arquivo'}</strong>
          <small>{file ? 'Escolha outro arquivo' : 'PDF, imagens ou outros formatos'}</small>
        </span>
        <span className="picker-arrow" aria-hidden="true">+</span>
      </label>
      <input
        ref={fileInput}
        className="visually-hidden"
        id="document-file"
        type="file"
        onChange={selectFile}
        disabled={isUploading}
      />

      {file && (
        <div className="selected-file">
          <span className="selected-file-name" title={file.name}>{file.name}</span>
          <span className="selected-file-size">{formatFileSize(file.size)}</span>
          <button className="clear-file" type="button" onClick={clearFile} aria-label="Remover arquivo selecionado">
            ×
          </button>
        </div>
      )}

      <button className="primary-button" type="submit" disabled={isUploading || !file}>
        <span aria-hidden="true">↑</span>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>

      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}