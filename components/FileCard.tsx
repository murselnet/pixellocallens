import React, { useMemo, useState } from 'react';
import { FileMetadata } from '../types';
import { FileSystemService } from '../services/fileSystemService';

interface Props {
  file: FileMetadata;
  onCopy: (file: FileMetadata) => void;
  onPreview?: (file: FileMetadata) => void;
  maxDimensions?: { width: number; height: number };
}

const FileCard: React.FC<Props> = ({ file, onCopy, onPreview, maxDimensions }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isImage = FileSystemService.isImageFile(file);

  const scaleStyles = useMemo(() => {
    if (!isImage || !file.width || !file.height || !maxDimensions) {
      return {};
    }

    const widthRatio = file.width / maxDimensions.width;
    const heightRatio = file.height / maxDimensions.height;
    const relativeWidth = Math.max(38, Math.max(widthRatio, heightRatio) * 100);

    return {
      width: `${relativeWidth}%`,
      aspectRatio: `${file.width} / ${file.height}`,
      margin: '0 auto',
      maxHeight: '100%'
    };
  }, [file, isImage, maxDimensions]);

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-gray-300 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-indigo-300 hover:shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute right-4 top-4 z-10 flex gap-2 transition-all duration-300 ${
          isHovered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        {isImage && onPreview && (
          <button
            type="button"
            onClick={() => onPreview(file)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-xl transition-all hover:scale-110 hover:text-indigo-600 active:scale-90"
            title="Buyuk onizleme"
          >
            <i className="fas fa-expand text-sm"></i>
          </button>
        )}
        <button
          type="button"
          onClick={() => onCopy(file)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition-all hover:scale-110 hover:bg-indigo-700 active:scale-90"
          title="Indir"
        >
          <i className="fas fa-download text-sm"></i>
        </button>
      </div>

      <button
        type="button"
        onClick={() => isImage && onPreview?.(file)}
        className={`relative flex min-h-[280px] items-center justify-center overflow-hidden border-b-2 border-gray-200 bg-gray-50 p-4 ${
          isImage ? 'cursor-zoom-in' : 'cursor-default'
        }`}
      >
        {isImage ? (
          <div
            style={scaleStyles}
            className="overflow-hidden rounded-lg bg-white shadow-2xl ring-2 ring-gray-300 transition-all duration-700 group-hover:ring-indigo-300"
          >
            <img src={file.previewUrl} alt={file.name} loading="lazy" className="h-full w-full object-contain" />
          </div>
        ) : null}
      </button>

      <div className="flex flex-grow flex-col justify-between border-t-2 border-slate-400 bg-slate-200 p-5">
        <div className="mb-4">
          <h3
            className="mb-2 truncate text-sm font-black leading-tight text-gray-900 transition-colors group-hover:text-indigo-600"
            title={file.name}
          >
            {file.name}
          </h3>
          {isImage && file.width && file.height && (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white px-3.5 py-1.5 text-sm font-black uppercase tracking-wide text-indigo-700 shadow-sm">
                {file.width} x {file.height}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 border-t border-slate-400 pt-4 text-xs font-black uppercase tracking-widest text-slate-600">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500">BOYUT</span>
            <span className="text-sm font-bold text-gray-800">{FileSystemService.formatBytes(file.size)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[10px] text-slate-500">UZANTI</span>
            <span className="inline-block self-end rounded-sm bg-white px-2.5 py-1 text-sm text-indigo-600 shadow-sm">
              {file.extension}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default FileCard;
