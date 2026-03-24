import React, { useEffect } from 'react';
import { FileMetadata } from '../types';
import { FileSystemService } from '../services/fileSystemService';

interface Props {
  file: FileMetadata | null;
  onClose: () => void;
}

const PreviewModal: React.FC<Props> = ({ file, onClose }) => {
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
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [file, onClose]);

  if (!file) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="grid max-h-[92vh] w-full max-w-6xl gap-0 overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[minmax(0,1.4fr)_360px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[320px] items-center justify-center bg-slate-100 p-6 md:p-10">
          <img src={file.previewUrl} alt={file.name} className="max-h-[72vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg transition hover:bg-white hover:text-indigo-600"
            title="Kapat"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <aside className="flex flex-col justify-between border-t border-slate-200 bg-white p-6 lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.35em] text-indigo-600">Buyuk onizleme</p>
            <h2 className="mb-3 break-words text-2xl font-black tracking-tight text-slate-900">{file.name}</h2>
            <p className="mb-6 text-sm leading-6 text-slate-500">
              Gorseli detayli incelemek, boyutlarini kontrol etmek ve dosya bilgisini tek yerde gormek icin bu paneli
              kullanabilirsiniz.
            </p>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Cozunurluk</p>
                <p className="text-lg font-black text-slate-900">
                  {file.width && file.height ? `${file.width} x ${file.height}` : 'Bilinmiyor'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Dosya boyutu</p>
                <p className="text-lg font-black text-slate-900">{FileSystemService.formatBytes(file.size)}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Son degisiklik</p>
                <p className="text-base font-bold text-slate-900">{FileSystemService.formatDate(file.lastModified)}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Konum</p>
                <p className="break-words text-sm font-bold text-slate-900">{file.relativePath || file.name}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
          >
            Kapat
          </button>
        </aside>
      </div>
    </div>
  );
};

export default PreviewModal;
