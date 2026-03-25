import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import FileCard from './components/FileCard';
import Notification from './components/Notification';
import PreviewModal from './components/PreviewModal';
import { desktopApi } from './services/desktopApi';
import { AppStatus, FileMetadata, FolderData, Notification as NotificationType, OrientationFilter, SortOption } from './types';

const fileNameCollator = new Intl.Collator('tr', {
  numeric: true,
  sensitivity: 'base'
});

const getFolderLabel = (fullPath: string | null) => {
  if (!fullPath) {
    return 'Henüz seçilmedi';
  }

  return fullPath.split(/[/\\]/).filter(Boolean).pop() ?? fullPath;
};

const App = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [targetDirectory, setTargetDirectory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('resolution');
  const [orientationFilter, setOrientationFilter] = useState<OrientationFilter>('all');
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  const deferredSearch = useDeferredValue(searchQuery);

  const notify = (message: string, type: NotificationType['type'] = 'info') => {
    setNotifications((current) => [...current, { id: Date.now() + Math.random(), message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => {
    desktopApi
      .getTargetDirectory()
      .then(({ targetDirectory }) => setTargetDirectory(targetDirectory))
      .catch(() => setTargetDirectory(null));
  }, []);

  const handleOpenFolder = async () => {
    try {
      setStatus(AppStatus.LOADING);
      const data = await desktopApi.openFolder();
      setFolder(data);
      setSelectedFile(null);
      setStatus(AppStatus.LOADED);
      notify(`"${data.name}" klasörü ve alt klasörleri tarandı.`, 'success');
    } catch (error) {
      setStatus(AppStatus.IDLE);
      const message = (error as Error).message;
      if (!message.toLowerCase().includes('iptal')) {
        notify(message, 'error');
      }
    }
  };

  const handleCopyFile = async (file: FileMetadata) => {
    try {
      const result = await desktopApi.copyFile(file);
      setTargetDirectory(result.targetDirectory);
      notify(`${file.name} hedef klasöre kopyalandı.`, 'success');
    } catch (error) {
      const message = (error as Error).message;
      if (!message.toLowerCase().includes('iptal')) {
        notify(message, 'error');
      }
    }
  };

  const handleRevealFile = async (file: FileMetadata) => {
    try {
      await desktopApi.openInExplorer(file);
    } catch (error) {
      notify((error as Error).message, 'error');
    }
  };

  const handleChangeTargetDirectory = async () => {
    try {
      const result = await desktopApi.changeTargetDirectory();
      setTargetDirectory(result.targetDirectory);
      notify('Hedef klasör güncellendi.', 'success');
    } catch (error) {
      const message = (error as Error).message;
      if (!message.toLowerCase().includes('iptal')) {
        notify(message, 'error');
      }
    }
  };

  const compareFiles = (left: FileMetadata, right: FileMetadata) => {
    switch (sortBy) {
      case 'size':
        return right.size - left.size || fileNameCollator.compare(left.name, right.name);
      case 'modified':
        return right.lastModified - left.lastModified || fileNameCollator.compare(left.name, right.name);
      case 'name':
        return fileNameCollator.compare(left.name, right.name);
      case 'resolution':
      default: {
        const leftPixels = (left.width ?? 0) * (left.height ?? 0);
        const rightPixels = (right.width ?? 0) * (right.height ?? 0);
        return rightPixels - leftPixels || fileNameCollator.compare(left.name, right.name);
      }
    }
  };

  const filteredFiles = useMemo(() => {
    if (!folder) {
      return [];
    }

    return folder.files
      .filter((file) => file.name.toLowerCase().includes(deferredSearch.toLowerCase()))
      .filter((file) => {
        if (orientationFilter === 'all') {
          return true;
        }

        if (!file.width || !file.height) {
          return false;
        }

        if (orientationFilter === 'landscape') {
          return file.width > file.height;
        }
        if (orientationFilter === 'portrait') {
          return file.height > file.width;
        }
        return file.width === file.height;
      })
      .slice()
      .sort(compareFiles);
  }, [deferredSearch, folder, orientationFilter, sortBy]);

  const stats = useMemo(
    () => ({
      total: filteredFiles.length,
      images: filteredFiles.length
    }),
    [filteredFiles.length]
  );

  const maxDimensions = useMemo(
    () =>
      filteredFiles.reduce(
        (current, file) => ({
          width: Math.max(current.width, file.width ?? 1),
          height: Math.max(current.height, file.height ?? 1)
        }),
        { width: 1, height: 1 }
      ),
    [filteredFiles]
  );

  const displayGroups = useMemo(() => {
    if (sortBy !== 'resolution') {
      return [
        {
          label:
            sortBy === 'name'
              ? 'İsme göre sıralandı'
              : sortBy === 'size'
                ? 'Boyuta göre sıralandı'
                : 'Tarihe göre sıralandı',
          files: filteredFiles
        }
      ];
    }

    const groups = new Map<string, FileMetadata[]>();

    filteredFiles.forEach((file) => {
      const key = file.width && file.height ? `${file.width}x${file.height}` : 'Bilinmiyor';
      const existing = groups.get(key) ?? [];
      existing.push(file);
      groups.set(key, existing);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => {
        if (left === 'Bilinmiyor') {
          return 1;
        }
        if (right === 'Bilinmiyor') {
          return -1;
        }

        const [leftWidth, leftHeight] = left.split('x').map(Number);
        const [rightWidth, rightHeight] = right.split('x').map(Number);
        return rightWidth * rightHeight - leftWidth * leftHeight;
      })
      .map(([resolution, files]) => ({ label: resolution, files }));
  }, [filteredFiles, sortBy]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Windows Desktop</p>
          <h1>PixelLocalLens</h1>
          <p className="muted">Yerel klasörlerdeki görselleri çözünürlüğe göre keşfet, filtrele ve kopyala.</p>
        </div>

        <div className="topbar__actions">
          {folder && (
            <input
              className="search-input"
              placeholder="Dosya ara..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          )}
          <button className="secondary-button" onClick={handleChangeTargetDirectory}>
            Hedef klasör seç
          </button>
          <button className="primary-button" onClick={handleOpenFolder}>
            {folder ? 'Yeni klasör tara' : 'Klasör tara'}
          </button>
        </div>
      </header>

      <main className="layout">
        {status === AppStatus.IDLE && !folder && (
          <section className="hero">
            <p className="eyebrow">PixelLocalLens Desktop</p>
            <h2>Görsellerinizi native Windows deneyimiyle tarayın.</h2>
            <p>
              Alt klasörler dahil tarama yapın, dosyaları çözünürlüğe göre gruplayın, büyük önizleme açın ve
              seçilen dosyaları hedef klasöre kopyalayın.
            </p>
            <button className="primary-button primary-button--large" onClick={handleOpenFolder}>
              Taramayı başlat
            </button>
          </section>
        )}

        {status === AppStatus.LOADING && (
          <section className="hero hero--loading">
            <div className="spinner" />
            <p>Dosyalar taranıyor...</p>
          </section>
        )}

        {folder && (
          <div className="content-stack">
            <section className="panel panel--filters">
              <div className="panel__heading">
                <div>
                  <p className="eyebrow">Klasör</p>
                  <h2>{folder.name}</h2>
                  <p className="muted">{folder.rootPath}</p>
                </div>

                <div>
                  <p className="eyebrow">Hedef Klasör</p>
                  <h2>{getFolderLabel(targetDirectory)}</h2>
                  <p className="muted">{targetDirectory ?? 'Kopyalama sırasında seçtiğiniz klasör burada görünecek.'}</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Toplam</span>
                    <strong>{stats.total}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Görsel</span>
                    <strong>{stats.images}</strong>
                  </div>
                </div>
              </div>

              <div className="filters-grid">
                <label>
                  <span>Sıralama</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                    <option value="resolution">Çözünürlüğe göre</option>
                    <option value="name">İsme göre</option>
                    <option value="size">Boyuta göre</option>
                    <option value="modified">Tarihe göre</option>
                  </select>
                </label>

                <label>
                  <span>Yönelim</span>
                  <select value={orientationFilter} onChange={(event) => setOrientationFilter(event.target.value as OrientationFilter)}>
                    <option value="all">Hepsi</option>
                    <option value="landscape">Yatay</option>
                    <option value="portrait">Dikey</option>
                    <option value="square">Kare</option>
                  </select>
                </label>
              </div>
            </section>

            {filteredFiles.length === 0 && (
              <section className="empty-state">
                <h3>Sonuç bulunamadı</h3>
                <p>Arama veya filtreleri değiştirerek listeyi yeniden daraltabilirsiniz.</p>
              </section>
            )}

            {displayGroups.length > 0 && (
              <section className="group-stack">
                {displayGroups.map((group) => (
                  <div className="resolution-group" key={group.label}>
                    <div className="resolution-group__header">
                      <h3>{group.label.replace('x', ' x ')}</h3>
                      <span>{group.files.length} dosya</span>
                    </div>

                    <div className="file-grid">
                      {group.files.map((file) => (
                        <FileCard
                          key={`${file.fullPath}-${file.lastModified}`}
                          file={file}
                          maxDimensions={maxDimensions}
                          onPreview={setSelectedFile}
                          onCopy={handleCopyFile}
                          onReveal={handleRevealFile}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </main>

      <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} onReveal={handleRevealFile} />

      <div className="toast-stack">
        {notifications.map((notification) => (
          <Notification key={notification.id} notification={notification} onClose={removeNotification} />
        ))}
      </div>
    </div>
  );
};

export default App;
