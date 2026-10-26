import DownloadButton from './DownloadButton.jsx';
import formatFileSize from '../services/formatFileSize.js';

function fileLabel(name) {
  const extension = name.includes('.') ? name.split('.').pop() : 'FILE';
  return extension.slice(0, 4).toUpperCase();
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, error, onDownload }) {
  if (isLoading) {
    return <div className="list-state" role="status">Carregando documentos...</div>;
  }

  if (error) {
    return <div className="list-state list-state--error" role="alert">{error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="list-state empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento neste espaço.</p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((item) => (
        <li className="document-row" key={item.id}>
          <span className="file-badge" aria-hidden="true">{fileLabel(item.originalName)}</span>
          <div className="document-details">
            <strong title={item.originalName}>{item.originalName}</strong>
            <span>{formatFileSize(item.size)} <i aria-hidden="true">·</i> {formatDate(item.uploadedAt)}</span>
          </div>
          <DownloadButton document={item} onDownload={onDownload} />
        </li>
      ))}
    </ul>
  );
}