
import React, { useState, useEffect, useMemo } from 'react';
import { FileSystemService } from './services/fileSystemService';
import { FileMetadata, FolderData, AppStatus, Notification as NotificationType } from './types';
import FileCard from './components/FileCard';
import Notification from './components/Notification';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModernApiAvailable, setIsModernApiAvailable] = useState(true);

  useEffect(() => {
    setIsModernApiAvailable(FileSystemService.isSupported());
  }, []);

  const addNotification = (message: string, type: NotificationType['type'] = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOpenFolder = async () => {
    try {
      setStatus(AppStatus.LOADING);
      const data = await FileSystemService.openDirectory();
      setFolder(data);
      setStatus(AppStatus.LOADED);
      addNotification(`"${data.name}" klasörü başarıyla tarandı.`, 'success');
    } catch (err) {
      setStatus(AppStatus.IDLE);
      const message = (err as Error).message;
      if (!message.includes('iptal edildi')) {
        addNotification(message, 'error');
      }
    }
  };

  const handleCopyFile = async (file: FileMetadata) => {
    try {
      await FileSystemService.copyFileToFolder(file.name, file.previewUrl);
      const actionLabel = isModernApiAvailable ? 'kopyalandı' : 'indirildi';
      addNotification(`${file.name} başarıyla ${actionLabel}.`, 'success');
    } catch (err) {
      const message = (err as Error).message;
      if (!message.includes('iptal edildi')) {
        addNotification(`İşlem başarısız: ${message}`, 'error');
      }
    }
  };

  // Filtrelenmiş dosyalar
  const filteredFiles = useMemo(() => {
    return folder?.files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [folder, searchQuery]);

  const imageExtensions = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];

  // Global maksimum boyutları hesapla (Gerçek orantılı ölçeklendirme için kritik)
  const maxDimensions = useMemo(() => {
    let maxW = 0;
    let maxH = 0;
    filteredFiles.forEach(f => {
      if (imageExtensions.includes(f.extension) && f.width && f.height) {
        if (f.width > maxW) maxW = f.width;
        if (f.height > maxH) maxH = f.height;
      }
    });
    return { width: maxW || 1, height: maxH || 1 };
  }, [filteredFiles]);

  // Dosyaları ayır ve görselleri çözünürlüğe göre grupla
  const { resolutionGroups, otherFiles } = useMemo(() => {
    const images = filteredFiles.filter(f => imageExtensions.includes(f.extension));
    const others = filteredFiles.filter(f => !imageExtensions.includes(f.extension));

    const groups: Record<string, FileMetadata[]> = {};
    images.forEach(img => {
      const resKey = img.width && img.height ? `${img.width}x${img.height}` : 'Bilinmiyor';
      if (!groups[resKey]) groups[resKey] = [];
      groups[resKey].push(img);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Bilinmiyor') return 1;
      if (b === 'Bilinmiyor') return -1;
      const [aw, ah] = a.split('x').map(Number);
      const [bw, bh] = b.split('x').map(Number);
      return (aw * ah) - (bw * bh);
    });

    return {
      resolutionGroups: sortedGroupKeys.map(key => ({
        resolution: key,
        files: groups[key].sort((a, b) => a.name.localeCompare(b.name))
      })),
      otherFiles: others.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [filteredFiles]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
              <i className="fas fa-expand text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter leading-none">pixellocallens</h1>
              <p className="text-[9px] text-indigo-600 font-bold tracking-widest uppercase mt-1">Pro Resolution Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {folder && (
              <div className="hidden md:flex relative group">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  placeholder="Dosya ara..."
                  className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-full text-sm transition-all w-64 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            <button 
              onClick={handleOpenFolder}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-indigo-200 active:scale-95 flex items-center gap-2"
            >
              <i className="fas fa-folder-open"></i>
              {folder ? 'YENİ KLASÖR' : 'BAŞLA'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {status === AppStatus.IDLE && !folder && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="relative mb-8">
               <div className="absolute -inset-4 bg-indigo-100 rounded-full blur-2xl opacity-50"></div>
               <i className="fas fa-images text-7xl text-indigo-600 relative"></i>
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Pikselleri Gerçek Boyutunda Keşfedin.</h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-10 text-lg leading-relaxed">
              <b>pixellocallens</b>, yerel klasörlerinizdeki görselleri çözünürlük oranlarına göre ölçeklendirerek size benzersiz bir tarama deneyimi sunar.
            </p>
            <button 
              onClick={handleOpenFolder}
              className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <i className="fas fa-rocket"></i>
              KLASÖR TARAMAYI BAŞLAT
            </button>
          </div>
        )}

        {status === AppStatus.LOADING && (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Pikseller Analiz Ediliyor...</p>
          </div>
        )}

        {folder && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-8 border-b border-gray-100">
              <div>
                <nav className="flex items-center gap-2 text-[10px] font-black text-indigo-600 mb-3 tracking-[0.2em] uppercase">
                  <i className="fas fa-link"></i>
                  <span>LOCAL</span>
                  <i className="fas fa-chevron-right text-[7px] text-gray-300"></i>
                  <span className="text-gray-400">{folder.name}</span>
                </nav>
                <h2 className="text-5xl font-black text-gray-900 tracking-tighter">
                  Medyalarınız
                  <span className="ml-4 text-sm font-bold text-indigo-400 bg-indigo-50 px-4 py-2 rounded-2xl align-middle tracking-normal">
                    {filteredFiles.length} Öğe Bulundu
                  </span>
                </h2>
              </div>
            </div>

            <div className="space-y-24">
              {resolutionGroups.length > 0 && (
                <section>
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                      <i className="fas fa-layer-group text-xl"></i>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Görsel Kanvası</h3>
                  </div>
                  
                  <div className="space-y-20">
                    {resolutionGroups.map((group) => (
                      <div key={group.resolution} className="animate-fade-in">
                        <div className="flex items-center gap-6 mb-8">
                          <h4 className="text-[12px] font-black text-indigo-700 bg-white px-5 py-2.5 rounded-xl border border-indigo-100 whitespace-nowrap shadow-sm">
                            <i className="fas fa-expand-arrows-alt mr-3 text-indigo-300"></i>
                            {group.resolution.replace('x', ' × ')}
                          </h4>
                          <div className="h-[2px] flex-grow bg-gradient-to-r from-indigo-50 via-gray-100 to-transparent"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10 items-end">
                          {group.files.map((file, idx) => (
                            <FileCard 
                              key={`img-${file.name}-${idx}`} 
                              file={file} 
                              onCopy={handleCopyFile}
                              maxDimensions={maxDimensions}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {otherFiles.length > 0 && (
                <section className="pt-16 border-t border-gray-100">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-xl shadow-gray-200">
                      <i className="fas fa-file-alt text-xl"></i>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Dosya Arşivi</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10 items-end">
                    {otherFiles.map((file, idx) => (
                      <FileCard 
                        key={`other-${file.name}-${idx}`} 
                        file={file} 
                        onCopy={handleCopyFile}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          <p>© 2024 pixellocallens Engine. Tüm hakları yereldir.</p>
          <div className="flex items-center gap-10">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
               <span className="text-indigo-600">Local Lens Pro Active</span>
             </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {notifications.map(n => (
          <Notification key={n.id} notification={n} onClose={removeNotification} />
        ))}
      </div>
    </div>
  );
};

export default App;
