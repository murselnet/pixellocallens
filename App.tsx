import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FileSystemService } from './services/fileSystemService';
import { AppStatus, FileMetadata, FolderData, Notification as NotificationType } from './types';
import FileCard from './components/FileCard';
import Notification from './components/Notification';
import PreviewModal from './components/PreviewModal';

type SortOption = 'name' | 'size' | 'modified' | 'resolution';
type OrientationFilter = 'all' | 'landscape' | 'portrait' | 'square';

const IMAGE_EXTENSIONS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('resolution');
  const [orientationFilter, setOrientationFilter] = useState<OrientationFilter>('all');
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isModernApiAvailable, setIsModernApiAvailable] = useState(true);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setIsModernApiAvailable(FileSystemService.isSupported());
  }, []);

  useEffect(() => {
    return () => {
      if (folder?.files) {
        FileSystemService.releaseFiles(folder.files);
      }
    };
  }, [folder]);

  const addNotification = (message: string, type: NotificationType['type'] = 'info') => {
    setNotifications((prev) => [...prev, { id: Date.now() + Math.random(), message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const handleOpenFolder = async () => {
    try {
      setStatus(AppStatus.LOADING);
      setSelectedFile(null);
      const data = await FileSystemService.openDirectory();
      setFolder((prev) => {
        if (prev?.files) {
          FileSystemService.releaseFiles(prev.files);
        }
        return data;
      });
      setStatus(AppStatus.LOADED);
      addNotification(`"${data.name}" klasoru ve alt klasorleri tarandi.`, 'success');
    } catch (err) {
      setStatus(AppStatus.IDLE);
      const message = (err as Error).message;
      if (!message.toLowerCase().includes('iptal')) {
        addNotification(message, 'error');
      }
    }
  };

  const handleCopyFile = async (file: FileMetadata) => {
    try {
      await FileSystemService.copyFileToFolder(file.name, file.previewUrl);
      addNotification(
        `${file.name} basariyla ${isModernApiAvailable ? 'kaydedildi' : 'indirildi'}.`,
        'success'
      );
    } catch (err) {
      const message = (err as Error).message;
      if (!message.toLowerCase().includes('iptal')) {
        addNotification(`Islem basarisiz: ${message}`, 'error');
      }
    }
  };

  const compareFiles = (left: FileMetadata, right: FileMetadata) => {
    switch (sortBy) {
      case 'size':
        return right.size - left.size || left.name.localeCompare(right.name, 'tr');
      case 'modified':
        return right.lastModified - left.lastModified || left.name.localeCompare(right.name, 'tr');
      case 'resolution': {
        const leftPixels = (left.width || 0) * (left.height || 0);
        const rightPixels = (right.width || 0) * (right.height || 0);
        return rightPixels - leftPixels || left.name.localeCompare(right.name, 'tr');
      }
      case 'name':
      default:
        return left.name.localeCompare(right.name, 'tr');
    }
  };

  const filteredFiles = useMemo(() => {
    if (!folder) {
      return [];
    }

    return folder.files
      .filter((file) => file.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()))
      .filter((file) => {
        if (orientationFilter === 'all' || !FileSystemService.isImageFile(file) || !file.width || !file.height) {
          return true;
        }

        if (orientationFilter === 'landscape') return file.width > file.height;
        if (orientationFilter === 'portrait') return file.height > file.width;
        if (orientationFilter === 'square') return file.width === file.height;
        return true;
      })
      .slice()
      .sort(compareFiles);
  }, [compareFiles, deferredSearchQuery, folder, orientationFilter]);

  const maxDimensions = useMemo(() => {
    return filteredFiles.reduce(
      (acc, file) => {
        if (IMAGE_EXTENSIONS.includes(file.extension) && file.width && file.height) {
          acc.width = Math.max(acc.width, file.width);
          acc.height = Math.max(acc.height, file.height);
        }
        return acc;
      },
      { width: 1, height: 1 }
    );
  }, [filteredFiles]);

  const resolutionGroups = useMemo(() => {
    const images = filteredFiles.filter((file) => IMAGE_EXTENSIONS.includes(file.extension));
    const groups: Record<string, FileMetadata[]> = {};

    images.forEach((image) => {
      const resolution = image.width && image.height ? `${image.width}x${image.height}` : 'Bilinmiyor';
      if (!groups[resolution]) {
        groups[resolution] = [];
      }
      groups[resolution].push(image);
    });

    const sortedGroupKeys = Object.keys(groups).sort((left, right) => {
      if (left === 'Bilinmiyor') return 1;
      if (right === 'Bilinmiyor') return -1;

      const [leftWidth, leftHeight] = left.split('x').map(Number);
      const [rightWidth, rightHeight] = right.split('x').map(Number);
      return rightWidth * rightHeight - leftWidth * leftHeight;
    });

    return sortedGroupKeys.map((key) => ({
      resolution: key,
      files: groups[key]
    }));
  }, [filteredFiles]);

  const stats = useMemo(() => {
    const imageCount = filteredFiles.filter((file) => FileSystemService.isImageFile(file)).length;
    return {
      total: filteredFiles.length,
      images: imageCount
    };
  }, [filteredFiles]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-auto max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:h-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
              <i className="fas fa-expand text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight text-gray-900">PixelLocalLens</h1>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.35em] text-indigo-600">
                Local Resolution Explorer
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {folder && (
              <div className="relative">
                <i className="fas fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Dosya ara..."
                  className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500 lg:w-72"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenFolder}
              className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95"
            >
              <i className="fas fa-folder-open"></i>
              {folder ? 'Yeni klasor sec' : 'Klasor tara'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col px-4 py-8 sm:px-6 lg:px-8">
        {status === AppStatus.IDLE && !folder && (
          <section className="flex h-[60vh] flex-col items-center justify-center text-center">
            <div className="relative mb-8">
              <div className="absolute -inset-4 rounded-full bg-indigo-100 opacity-50 blur-2xl"></div>
              <i className="fas fa-images relative text-7xl text-indigo-600"></i>
            </div>
            <h2 className="mb-4 text-4xl font-black tracking-tight text-gray-900">Gorsellerinizi gercek oranlariyla kesfedin.</h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-500">
              Yerel klasorlerinizi ve alt klasorlerinizi tarayin, gorselleri cozunurluge gore gruplayin, dosyalari
              filtreleyin ve tek tikla buyuk onizleme acin.
            </p>
            <button
              type="button"
              onClick={handleOpenFolder}
              className="flex items-center gap-3 rounded-full bg-gray-900 px-10 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:bg-black active:scale-95"
            >
              <i className="fas fa-rocket"></i>
              Klasor taramayi baslat
            </button>
          </section>
        )}

        {status === AppStatus.LOADING && (
          <section className="flex flex-col items-center justify-center py-32">
            <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-indigo-600">Dosyalar taraniyor...</p>
          </section>
        )}

        {folder && (
          <div className="animate-fade-in">
            <section className="mb-10 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <nav className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
                    <i className="fas fa-folder-tree"></i>
                    <span>LOCAL</span>
                    <i className="fas fa-chevron-right text-[7px] text-gray-300"></i>
                    <span className="text-gray-400">{folder.name}</span>
                  </nav>
                  <h2 className="text-4xl font-black tracking-tight text-gray-900">Medyalariniz</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Alt klasorler dahil taranan dosyalar burada listelenir. Buyuk onizleme icin gorsele tiklayin.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400">Toplam</div>
                    <div className="mt-2 text-2xl font-black text-indigo-700">{stats.total}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">Gorsel</div>
                    <div className="mt-2 text-2xl font-black text-emerald-700">{stats.images}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Siralama</span>
                  <select
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                  >
                    <option value="resolution">Cozunurluge gore</option>
                    <option value="name">Isme gore</option>
                    <option value="size">Boyuta gore</option>
                    <option value="modified">Tarihe gore</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Yonelim</span>
                  <select
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={orientationFilter}
                    onChange={(event) => setOrientationFilter(event.target.value as OrientationFilter)}
                  >
                    <option value="all">Hepsi</option>
                    <option value="landscape">Yatay</option>
                    <option value="portrait">Dikey</option>
                    <option value="square">Kare</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-24">
              {resolutionGroups.length > 0 && (
                <section>
                  <div className="mb-12 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100">
                      <i className="fas fa-layer-group text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black uppercase tracking-tight text-gray-900">Gorsel kanvasi</h3>
                      <p className="mt-1 text-sm text-gray-500">Ayni cozunurlukteki dosyalar birlikte listelenir.</p>
                    </div>
                  </div>

                  <div className="space-y-20">
                    {resolutionGroups.map((group) => (
                      <div key={group.resolution}>
                        <div className="mb-8 flex items-center gap-6">
                          <h4 className="whitespace-nowrap rounded-xl border border-indigo-100 bg-white px-5 py-2.5 text-[12px] font-black text-indigo-700 shadow-sm">
                            <i className="fas fa-expand-arrows-alt mr-3 text-indigo-300"></i>
                            {group.resolution.replace('x', ' x ')}
                          </h4>
                          <div className="h-[2px] flex-grow bg-gradient-to-r from-indigo-50 via-gray-100 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 items-end gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                          {group.files.map((file) => (
                            <FileCard
                              key={`${file.relativePath || file.name}-${file.lastModified}`}
                              file={file}
                              onCopy={handleCopyFile}
                              onPreview={setSelectedFile}
                              maxDimensions={maxDimensions}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {filteredFiles.length === 0 && (
                <section className="rounded-[28px] border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                  <p className="text-xl font-black text-gray-900">Sonuc bulunamadi</p>
                  <p className="mt-2 text-gray-500">
                    Arama kelimesini veya filtreleri degistirerek dosyalarinizi yeniden listeleyebilirsiniz.
                  </p>
                </section>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mt-24 border-t border-gray-100 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 sm:px-6 lg:flex-row lg:px-8">
          <p>PixelLocalLens yerel dosyalarinizla calisir. Veriler tarayiciniz disina cikarilmaz.</p>
          <div className="flex items-center gap-3 text-indigo-600">
            <div className="h-2 w-2 animate-ping rounded-full bg-indigo-500"></div>
            <span>Yerel galeri hazir</span>
          </div>
        </div>
      </footer>

      <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />

      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        {notifications.map((notification) => (
          <Notification key={notification.id} notification={notification} onClose={removeNotification} />
        ))}
      </div>
    </div>
  );
};

export default App;
