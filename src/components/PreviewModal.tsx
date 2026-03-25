import { useEffect } from 'react';
import { FileMetadata } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { usePreviewDataUrl } from '../utils/usePreviewDataUrl';

interface Props {
  file: FileMetadata | null;
  onClose: () => void;
  onReveal: (file: FileMetadata) => void;
}

const PreviewModal = ({ file, onClose, onReveal }: Props) => {
  const previewSrc = usePreviewDataUrl(file?.fullPath ?? '', 1400);

  useEffect(() => {
    if (!file) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose]);

  if (!file) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal__close-button" onClick={onClose} aria-label="Önizlemeyi kapat">
          <span />
          <span />
        </button>
        <div className="modal__viewer">
          {previewSrc ? <img src={previewSrc} alt={file.name} className="modal__image" /> : <p>Önizleme yükleniyor...</p>}
        </div>
        <aside className="modal__sidebar">
          <div className="modal__header">
            <p className="eyebrow">Büyük Önizleme</p>
            <h2>{file.name}</h2>
            <p className="muted">Dosya detayları ve klasör konumu tek panelde görünür.</p>
          </div>

          <div className="detail-grid">
            <div className="detail-card">
              <span>Çözünürlük</span>
              <strong>{file.width && file.height ? `${file.width} x ${file.height}` : 'Bilinmiyor'}</strong>
            </div>
            <div className="detail-card">
              <span>Boyut</span>
              <strong>{formatBytes(file.size)}</strong>
            </div>
            <div className="detail-card">
              <span>Son değişiklik</span>
              <strong>{formatDate(file.lastModified)}</strong>
            </div>
            <div className="detail-card">
              <span>Konum</span>
              <strong>{file.relativePath}</strong>
            </div>
          </div>

          <div className="modal__actions">
            <button className="secondary-button" onClick={() => onReveal(file)}>
              Explorer'da göster
            </button>
            <button className="primary-button" onClick={onClose}>
              Kapat
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PreviewModal;
