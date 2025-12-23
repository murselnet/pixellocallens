
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
    const relativeWidth = Math.max(15, (file.width / maxDimensions.width) * 100);
    
    return {
      width: `${relativeWidth}%`,
      aspectRatio: `${file.width} / ${file.height}`,
      margin: '0 auto',
      maxHeight: '100%'
    };
  }, [file, maxDimensions, isImage]);

  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col h-full"
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
      <div className="relative bg-gray-50 flex items-center justify-center p-6 overflow-hidden min-h-[220px]">
        {isImage ? (
          <div style={scaleStyles} className="shadow-2xl rounded-lg overflow-hidden bg-white ring-1 ring-gray-200/50 transition-all duration-700 group-hover:ring-indigo-200">
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
      <div className="p-5 border-t border-gray-50 bg-white flex flex-col justify-between flex-grow">
        <div className="mb-4">
          <h3 className="text-[12px] font-black text-gray-900 truncate mb-1.5 leading-tight group-hover:text-indigo-600 transition-colors" title={file.name}>
            {file.name}
          </h3>
          {isImage && file.width && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                {file.width} × {file.height}
              </span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 border-t border-gray-50 pt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
          <div className="flex flex-col gap-1">
            <span className="text-gray-300 text-[8px]">VOLUME</span>
            <span className="text-gray-800 font-bold">{FileSystemService.formatBytes(file.size)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-gray-300 text-[8px]">MIME</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm inline-block self-end">{file.extension}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
