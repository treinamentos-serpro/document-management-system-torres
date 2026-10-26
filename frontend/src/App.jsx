import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { downloadDocument, listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('dms-user-id') || 'demo-user');
  const [draftUserId, setDraftUserId] = useState(() => localStorage.getItem('dms-user-id') || 'demo-user');
  const [userError, setUserError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('dms-user-id', userId);
  }, [userId]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError('');

    listDocuments(userId)
      .then((result) => {
        if (isCurrent) setDocuments(result);
      })
      .catch((error) => {
        if (isCurrent) setLoadError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [userId, refreshKey]);

  function applyUser(event) {
    event.preventDefault();
    const nextUserId = draftUserId.trim();
    if (!nextUserId) {
      setUserError('Informe um identificador de usuário.');
      return;
    }

    setUserError('');
    setNotice('');
    setDocuments([]);
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    await uploadDocument(userId, file);
    setNotice('Documento enviado.');
    setRefreshKey((current) => current + 1);
  }

  function handleDownload(document) {
    return downloadDocument(userId, document);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">D</span>
          <div>
            <p className="brand-caption">ARQUIVO DIGITAL</p>
            <h1>Documentos</h1>
          </div>
        </div>

        <form className="identity-form" onSubmit={applyUser}>
          <label htmlFor="user-id">Usuário</label>
          <input
            id="user-id"
            value={draftUserId}
            onChange={(event) => setDraftUserId(event.target.value)}
            aria-describedby={userError ? 'user-error' : undefined}
          />
          <button type="submit" aria-label="Aplicar usuário" title="Aplicar usuário">
            <span aria-hidden="true">↵</span>
          </button>
          {userError && <span className="identity-error" id="user-error" role="alert">{userError}</span>}
        </form>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO PESSOAL <span aria-hidden="true">/</span> {userId}</p>
            <h2 id="page-title">Sua biblioteca</h2>
          </div>
          <div className="document-count" aria-label={`${documents.length} documentos`}>
            <span>NO ACERVO</span>
            <strong>{String(documents.length).padStart(2, '0')}</strong>
          </div>
        </section>

        <div className="workspace-grid">
          <section className="upload-panel" aria-labelledby="upload-title">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-index">01</span>
                <h3 id="upload-title">Novo documento</h3>
              </div>
              <span className="limit-label">até 10 MiB</span>
            </div>
            <UploadComponent onUpload={handleUpload} />
          </section>

          <section className="documents-panel" aria-labelledby="documents-title">
            <div className="section-heading">
              <div className="section-title-group">
                <span className="section-index section-index--coral">02</span>
                <h3 id="documents-title">Seus documentos</h3>
              </div>
              <span className="list-count">{documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
            </div>
            {notice && <p className="success-notice" role="status">{notice}</p>}
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={loadError}
              onDownload={handleDownload}
            />
          </section>
        </div>

        <footer className="app-footer">
          <span><i className="status-dot" aria-hidden="true" /> ARMAZENAMENTO LOCAL</span>
          <span>METADADOS EM MEMÓRIA</span>
        </footer>
      </main>
    </div>
  );
}