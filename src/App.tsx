import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import FileCard from './components/FileCard';
import Notification from './components/Notification';
import PreviewModal from './components/PreviewModal';
import { desktopApi } from './services/desktopApi';
import {
  AppStatus,
  CopyConflictRule,
  CopyGroupingRule,
  CopyRules,
  DuplicateFilter,
  FileMetadata,
  FolderData,
  Notification as NotificationType,
  OrientationFilter,
  SortOption,
  UpdateStatusPayload
} from './types';

const fileNameCollator = new Intl.Collator('tr', {
  numeric: true,
  sensitivity: 'base'
});

const appIconUrl = new URL('./app-icon.png', window.location.href).toString();
const defaultCopyRules: CopyRules = { grouping: 'none', conflict: 'rename' };

const getFolderLabel = (fullPath: string | null) => {
  if (!fullPath) {
    return 'Henuz secilmedi';
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
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>('all');
  const [copyRules, setCopyRules] = useState<CopyRules>(defaultCopyRules);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusPayload | null>(null);

  const deferredSearch = useDeferredValue(searchQuery);

  const notify = (message: string, type: NotificationType['type'] = 'info') => {
    setNotifications((current) => [...current, { id: Date.now() + Math.random(), message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => {
    desktopApi
      .getAppVersion()
      .then(({ version }) => setAppVersion(version))
      .catch(() => setAppVersion(''));

    desktopApi
      .getTargetDirectory()
      .then(({ targetDirectory }) => setTargetDirectory(targetDirectory))
      .catch(() => setTargetDirectory(null));

    const unsubscribe = desktopApi.onUpdateStatus((payload) => {
      setUpdateStatus(payload);

      if (payload.status === 'available') {
        notify(payload.message, 'info');
      }

      if (payload.status === 'downloaded') {
        notify(payload.message, 'success');
      }

      if (payload.status === 'error') {
        notify(payload.message, 'error');
      }

      if ((payload.status === 'not-available' || payload.status === 'dev-mode') && payload.source === 'manual') {
        notify(payload.message, 'info');
      }
    });

    return unsubscribe;
  }, []);

  const handleCheckForUpdates = async () => {
    try {
      const result = await desktopApi.checkForUpdates();
      if (!result.started && result.reason === 'busy') {
        notify('Su anda zaten bir guncelleme kontrolu ya da indirme islemi suruyor.', 'info');
      }
    } catch (error) {
      const message = (error as Error).message;
      notify(message.includes('No published versions on GitHub') ? 'GitHub tarafinda henuz publish edilmis bir release yok.' : message, 'error');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const result = await desktopApi.installUpdateNow();
      if (!result.ok) {
        notify('Henuz kurulmaya hazir bir guncelleme bulunmuyor.', 'info');
      }
    } catch (error) {
      notify((error as Error).message, 'error');
    }
  };

  const handleDownloadAndInstallUpdate = async () => {
    try {
      const result = await desktopApi.downloadAndInstallUpdate();
      if (!result.started && result.reason === 'busy') {
        notify('Su anda zaten bir guncelleme kontrolu ya da indirme islemi suruyor.', 'info');
      }
      if (!result.started && result.reason === 'no-update') {
        notify('Indirilecek hazir bir guncelleme bulunmuyor.', 'info');
      }
    } catch (error) {
      notify((error as Error).message, 'error');
    }
  };

  const handleOpenFolder = async () => {
    try {
      setStatus(AppStatus.LOADING);
      const data = await desktopApi.openFolder();
      setFolder(data);
      setSelectedFile(null);
      setStatus(AppStatus.LOADED);
      notify(`"${data.name}" klasoru ve alt klasorleri tarandi.`, 'success');
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
      const result = await desktopApi.copyFile(file, copyRules);
      setTargetDirectory(result.targetDirectory);
      if (result.skipped) {
        notify(`${file.name} ayni isimli dosya oldugu icin kopyalanmadi.`, 'info');
        return;
      }

      notify(`${file.name} hedef klasore kopyalandi.`, 'success');
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
      notify('Hedef klasor guncellendi.', 'success');
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
      .filter((file) => {
        if (duplicateFilter === 'all') {
          return true;
        }

        const isDuplicate = (file.duplicateCount ?? 1) > 1;
        return duplicateFilter === 'duplicates' ? isDuplicate : !isDuplicate;
      })
      .slice()
      .sort(compareFiles);
  }, [deferredSearch, duplicateFilter, folder, orientationFilter, sortBy]);

  const stats = useMemo(
    () => ({
      total: filteredFiles.length,
      images: filteredFiles.length,
      duplicates: filteredFiles.filter((file) => (file.duplicateCount ?? 1) > 1).length
    }),
    [filteredFiles]
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
    if (duplicateFilter === 'duplicates') {
      const duplicateGroups = new Map<string, FileMetadata[]>();

      filteredFiles.forEach((file) => {
        if (!file.duplicateGroupKey) {
          return;
        }

        const existing = duplicateGroups.get(file.duplicateGroupKey) ?? [];
        existing.push(file);
        duplicateGroups.set(file.duplicateGroupKey, existing);
      });

      return [...duplicateGroups.values()]
        .sort((left, right) => right.length - left.length || compareFiles(left[0], right[0]))
        .map((files, index) => ({
          label: `Yinelenen Grup ${index + 1}`,
          files
        }));
    }

    if (sortBy !== 'resolution') {
      return [
        {
          label:
            sortBy === 'name'
              ? 'Isme gore siralandi'
              : sortBy === 'size'
                ? 'Boyuta gore siralandi'
                : 'Tarihe gore siralandi',
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
  }, [compareFiles, duplicateFilter, filteredFiles, sortBy]);

  const copyRulesDescription = useMemo(() => {
    const groupingLabel =
      copyRules.grouping === 'resolution'
        ? 'çözünürlüğe göre alt klasör oluştur'
        : copyRules.grouping === 'extension'
          ? 'uzantıya göre alt klasör oluştur'
          : copyRules.grouping === 'date'
            ? 'tarihe göre alt klasör oluştur'
            : 'doğrudan hedef klasöre kopyala';

    const conflictLabel =
      copyRules.conflict === 'overwrite'
        ? 'aynı isim varsa üzerine yaz'
        : copyRules.conflict === 'skip'
          ? 'aynı isim varsa atla'
          : 'aynı isim varsa yeni ad üret';

    return `${groupingLabel}, ${conflictLabel}.`;
  }, [copyRules.conflict, copyRules.grouping]);

  const isUpdateBusy = updateStatus?.status === 'checking' || updateStatus?.status === 'downloading';
  const canDownloadAndInstall = updateStatus?.status === 'available';
  const updateButtonLabel =
    updateStatus?.status === 'downloaded'
      ? 'Guncellemeyi kur'
      : canDownloadAndInstall
        ? 'Indir ve kur'
      : isUpdateBusy
        ? 'Guncelleme suruyor'
        : 'Guncellemeleri kontrol et';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-lockup__icon" src={appIconUrl} alt="PixelLocalLens ikonu" />
          <div>
            <p className="eyebrow">Windows Desktop</p>
            <h1>PixelLocalLens</h1>
            <p className="muted">Yerel klasorlerdeki gorselleri cozunurluge gore kesfet, filtrele ve kopyala.</p>
            <div className="status-strip">
              {appVersion && <span className="status-chip">v{appVersion}</span>}
              {updateStatus?.message && <span className="status-text">{updateStatus.message}</span>}
            </div>
          </div>
        </div>

        <div className="topbar__actions">
          {folder && (
            <div className="topbar__search">
              <input
                className="search-input"
                placeholder="Dosya ara..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          )}
          <div className="topbar__buttons">
            <button
              className="secondary-button"
              disabled={isUpdateBusy}
              onClick={
                updateStatus?.status === 'downloaded'
                  ? handleInstallUpdate
                  : canDownloadAndInstall
                    ? handleDownloadAndInstallUpdate
                    : handleCheckForUpdates
              }
            >
              {updateButtonLabel}
            </button>
            <button className="secondary-button" onClick={handleChangeTargetDirectory}>
              Hedef klasor sec
            </button>
            <button className="primary-button" onClick={handleOpenFolder}>
              {folder ? 'Yeni klasor tara' : 'Klasor tara'}
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        {status === AppStatus.IDLE && !folder && (
          <section className="hero">
            <p className="eyebrow">PixelLocalLens Desktop</p>
            <h2>Gorsellerinizi native Windows deneyimiyle tarayin.</h2>
            <p>Alt klasorler dahil tarama yapin, dosyalari cozunurluge gore gruplayin, buyuk onizleme acin ve secilen dosyalari hedef klasore kopyalayin.</p>
            <button className="primary-button primary-button--large" onClick={handleOpenFolder}>
              Taramayi baslat
            </button>
          </section>
        )}

        {status === AppStatus.LOADING && (
          <section className="hero hero--loading">
            <div className="spinner" />
            <p>Dosyalar taraniyor...</p>
          </section>
        )}

        {folder && (
          <div className="content-stack">
            <section className="panel panel--filters">
              <div className="panel__heading">
                <div>
                  <p className="eyebrow">Klasor</p>
                  <h2>{folder.name}</h2>
                  <p className="muted">{folder.rootPath}</p>
                </div>

                <div>
                  <p className="eyebrow">Hedef Klasor</p>
                  <h2>{getFolderLabel(targetDirectory)}</h2>
                  <p className="muted">{targetDirectory ?? 'Kopyalama sirasinda sectiginiz klasor burada gorunecek.'}</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Toplam</span>
                    <strong>{stats.total}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Gorsel</span>
                    <strong>{stats.images}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Yinelenen</span>
                    <strong>{stats.duplicates}</strong>
                  </div>
                </div>
              </div>

              <div className="filters-grid">
                <label>
                  <span>Siralama</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                    <option value="resolution">Cozunurluge gore</option>
                    <option value="name">Isme gore</option>
                    <option value="size">Boyuta gore</option>
                    <option value="modified">Tarihe gore</option>
                  </select>
                </label>

                <label>
                  <span>Yonelim</span>
                  <select value={orientationFilter} onChange={(event) => setOrientationFilter(event.target.value as OrientationFilter)}>
                    <option value="all">Hepsi</option>
                    <option value="landscape">Yatay</option>
                    <option value="portrait">Dikey</option>
                    <option value="square">Kare</option>
                  </select>
                </label>

                <label>
                  <span>Yinelenenler</span>
                  <select value={duplicateFilter} onChange={(event) => setDuplicateFilter(event.target.value as DuplicateFilter)}>
                    <option value="all">Hepsi</option>
                    <option value="duplicates">Sadece yinelenenler</option>
                    <option value="unique">Sadece tekil dosyalar</option>
                  </select>
                </label>
              </div>

              <div className="filters-grid filters-grid--copy-rules">
                <label>
                  <span>Kopyalama duzeni</span>
                  <select
                    value={copyRules.grouping}
                    onChange={(event) =>
                      setCopyRules((current) => ({ ...current, grouping: event.target.value as CopyGroupingRule }))
                    }
                  >
                    <option value="none">Ek klasor olusturma</option>
                    <option value="resolution">Cozunurluge gore klasorle</option>
                    <option value="extension">Uzantiya gore klasorle</option>
                    <option value="date">Tarihe gore klasorle</option>
                  </select>
                </label>

                <label>
                  <span>Ad cakismasi</span>
                  <select
                    value={copyRules.conflict}
                    onChange={(event) =>
                      setCopyRules((current) => ({ ...current, conflict: event.target.value as CopyConflictRule }))
                    }
                  >
                    <option value="rename">Yeni ad olustur</option>
                    <option value="overwrite">Uzerine yaz</option>
                    <option value="skip">Atla</option>
                  </select>
                </label>

                <div className="rule-summary-card">
                  <span>Kopyalama kurali</span>
                  <strong>{copyRulesDescription}</strong>
                </div>
              </div>
            </section>

            {filteredFiles.length === 0 && (
              <section className="empty-state">
                <h3>Sonuc bulunamadi</h3>
                <p>Arama veya filtreleri degistirerek listeyi yeniden daraltabilirsiniz.</p>
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
