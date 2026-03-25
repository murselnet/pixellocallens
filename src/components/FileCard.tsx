import { useMemo } from 'react';
import { FileMetadata } from '../types';
import { formatBytes } from '../utils/formatters';
import { usePreviewDataUrl } from '../utils/usePreviewDataUrl';

interface Props {
  file: FileMetadata;
  maxDimensions: { width: number; height: number };
  onPreview: (file: FileMetadata) => void;
  onCopy: (file: FileMetadata) => void;
  onReveal: (file: FileMetadata) => void;
}

const FileCard = ({ file, maxDimensions, onPreview, onCopy, onReveal }: Props) => {
  const previewSrc = usePreviewDataUrl(file.fullPath, 480);

  const scaleStyle = useMemo(() => {
    if (!file.width || !file.height) {
      return undefined;
    }

    const widthRatio = file.width / maxDimensions.width;
    const heightRatio = file.height / maxDimensions.height;
    const relativeWidth = Math.max(0.36, Math.max(widthRatio, heightRatio));

    return {
      width: `${relativeWidth * 100}%`,
      aspectRatio: `${file.width} / ${file.height}`
    };
  }, [file.height, file.width, maxDimensions.height, maxDimensions.width]);

  return (
    <article className="file-card">
      <div className="file-card__toolbar">
        <button className="icon-button" onClick={() => onPreview(file)}>
          Önizle
        </button>
        <button className="icon-button" onClick={() => onCopy(file)}>
          Kopyala
        </button>
      </div>

      <button className="file-card__preview" onClick={() => onPreview(file)}>
        <div className="file-card__preview-frame" style={scaleStyle}>
          {previewSrc ? <img src={previewSrc} alt={file.name} loading="lazy" className="file-card__image" /> : <span>Önizleme yükleniyor</span>}
        </div>
      </button>

      <div className="file-card__body">
        <div>
          <h3 title={file.name}>{file.name}</h3>
          <p className="file-card__resolution">{file.width && file.height ? `${file.width} x ${file.height}` : 'Bilinmiyor'}</p>
          {file.duplicateCount && file.duplicateCount > 1 && <p className="file-card__duplicate">Yinelenen grup: {file.duplicateCount} dosya</p>}
        </div>

        <div className="file-card__meta">
          <div>
            <span>Boyut</span>
            <strong>{formatBytes(file.size)}</strong>
          </div>
          <div>
            <span>Uzanti</span>
            <strong>{file.extension}</strong>
          </div>
        </div>

        <button className="text-button" onClick={() => onReveal(file)}>
          Konumu aç
        </button>
      </div>
    </article>
  );
};

export default FileCard;
