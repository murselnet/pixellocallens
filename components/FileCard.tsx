
import React, { useState, useMemo } from 'react';
import { FileMetadata } from '../types';
import { FileSystemService } from '../services/fileSystemService';

interface Props {
  file: FileMetadata;
  onCopy: (file: FileMetadata) => void;
  maxDimensions?: { width: number; height: number };
}

const FileCard: React.FC<Props> = ({ file, onCopy, maxDimensions }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isImage = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(file.extension);

  // Ölçeklendirme: Gerçek çözünürlük / Maksimum çözünürlük
  const scaleStyles = useMemo(() => {
    if (!isImage || !file.width || !file.height || !maxDimensions) return {};
    
    // Genişliği klasördeki en büyük genişliğe oranla
    // Minimum %15 veriyoruz ki aşırı küçük dosyalar (16x16 iconlar gibi) seçilebilsin
    const widthRatio = file.width / maxDimensions.width;
    const heightRatio = file.height / maxDimensions.height;
    const relativeWidth = Math.max(38, Math.max(widthRatio, heightRatio) * 100);
    
    return {
      width: `${relativeWidth}%`,
      aspectRatio: `${file.width} / ${file.height}`,
      margin: '0 auto',
      maxHeight: '100%'
    };
  }, [file, maxDimensions, isImage]);

  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-sm border-2 border-gray-300 overflow-hidden hover:shadow-2xl hover:border-indigo-300 transition-all duration-500 transform hover:-translate-y-2 flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* İndirme Butonu */}
      <div className={`absolute top-4 right-4 z-10 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <button 
          onClick={() => onCopy(file)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-90"
          title="Kopyala veya İndir"
        >
          <i className="fas fa-download text-sm"></i>
        </button>
      </div>

      {/* Önizleme Alanı - Dinamik Boyutlandırma */}
      <div className="relative bg-gray-50 flex items-center justify-center p-4 overflow-hidden min-h-[280px] border-b-2 border-gray-200">
        {isImage ? (
          <div style={scaleStyles} className="shadow-2xl rounded-lg overflow-hidden bg-white ring-2 ring-gray-300 transition-all duration-700 group-hover:ring-indigo-300">
            <img 
              src={file.previewUrl} 
              alt={file.name} 
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-24 h-24 flex flex-col items-center justify-center p-4 text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-xl">
            <i className="fas fa-file-code text-3xl mb-2 text-indigo-400"></i>
            <span className="text-[9px] font-black tracking-widest uppercase opacity-40">SYSTEM</span>
          </div>
        )}
      </div>

      {/* Bilgi Paneli */}
      <div className="p-5 border-t-2 border-slate-400 bg-slate-200 flex flex-col justify-between flex-grow">
        <div className="mb-4">
          <h3 className="text-sm font-black text-gray-900 truncate mb-2 leading-tight group-hover:text-indigo-600 transition-colors" title={file.name}>
            {file.name}
          </h3>
          {isImage && file.width && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-indigo-700 bg-white px-3.5 py-1.5 rounded-md uppercase tracking-wide shadow-sm">
                {file.width} × {file.height}
              </span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 border-t border-slate-400 pt-4 text-xs font-black text-slate-600 uppercase tracking-widest">
          <div className="flex flex-col gap-1">
            <span className="text-slate-500 text-[10px]">VOLUME</span>
            <span className="text-gray-800 text-sm font-bold">{FileSystemService.formatBytes(file.size)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-slate-500 text-[10px]">MIME</span>
            <span className="text-indigo-600 text-sm bg-white px-2.5 py-1 rounded-sm inline-block self-end shadow-sm">{file.extension}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
