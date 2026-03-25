import { useEffect, useState } from 'react';
import { desktopApi } from '../services/desktopApi';

export function usePreviewDataUrl(fullPath: string, maxSize?: number) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setPreviewSrc(null);

    if (!fullPath) {
      return () => {
        cancelled = true;
      };
    }

    desktopApi
      .getPreviewDataUrl(fullPath, maxSize)
      .then(({ dataUrl }) => {
        if (!cancelled) {
          setPreviewSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewSrc(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fullPath, maxSize]);

  return previewSrc;
}
