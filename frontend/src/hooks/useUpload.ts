import { useState, useCallback } from 'react';
import { api } from '@/services/api';

interface PresignResponse {
  uploadUrl: string;
  key: string;
}

interface UploadOptions {
  type: 'thumbnail' | 'video' | 'page';
  moduloId: number;
  aulaId?: number;
  pageOrder?: number;
  contentType: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, options: UploadOptions): Promise<string | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const { data } = await api.post<PresignResponse>('/conteudo/upload/presign', {
        ...options,
        contentType: file.type,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setProgress(100);
      return data.key;
    } catch (err: any) {
      setError(err?.message || 'Erro no upload');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}
