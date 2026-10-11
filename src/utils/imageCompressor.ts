/**
 * imageCompressor.ts
 *
 * Client-side smart image compression and storage quota protection utility.
 * Downscales and compresses large images (screenshots, high-res photos) to
 * prevent exceeding browser localStorage quota (~5MB) and optimize document rendering.
 */

export interface StorageUsageInfo {
  usedBytes: number;
  quotaBytes: number;
  usedFormatted: string;
  quotaFormatted: string;
  percent: number;
  isNearLimit: boolean;
}

/**
 * Calculates current localStorage usage in bytes.
 * Standard browser quota is approximately 5MB (5,242,880 bytes).
 */
export function getLocalStorageUsage(): StorageUsageInfo {
  let usedBytes = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          // UTF-16 characters take ~2 bytes each in memory
          usedBytes += (key.length + val.length) * 2;
        }
      }
    }
  } catch {
    // Ignore storage inspection errors
  }

  const quotaBytes = 5 * 1024 * 1024; // 5 MB standard quota
  const percent = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  const isNearLimit = percent >= 80;

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  return {
    usedBytes,
    quotaBytes,
    usedFormatted: formatSize(usedBytes),
    quotaFormatted: formatSize(quotaBytes),
    percent,
    isNearLimit,
  };
}

/**
 * Compresses an image (File, Blob, or base64 data URL) to a lightweight data URL.
 * Resizes images exceeding max dimensions and converts to WebP/JPEG at ~82% quality.
 * Typical reduction: 3-8 MB raw screenshot -> 80-180 KB (95%+ reduction).
 */
export async function compressImageToDataUrl(
  source: File | Blob | string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<string> {
  let rawDataUrl: string;

  if (typeof source === 'string') {
    rawDataUrl = source;
  } else {
    rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(source);
    });
  }

  // If source is SVG or small GIF, preserve as-is to keep vector crispness / animation
  if (
    rawDataUrl.startsWith('data:image/svg+xml') ||
    rawDataUrl.startsWith('data:image/gif')
  ) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already very small (< 100KB) and within max dimensions, keep it
        if (rawDataUrl.length < 100 * 1024 && width <= maxWidth && height <= maxHeight) {
          resolve(rawDataUrl);
          return;
        }

        // Calculate aspect ratio downscaling
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        // High quality bicubic downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (supported by 97%+ browsers)
        let compressed = canvas.toDataURL('image/webp', quality);

        // Check if WebP was produced (if browser doesn't support WebP, it returns PNG)
        if (!compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        // If compressed size is actually larger than original, return original
        if (compressed.length >= rawDataUrl.length && rawDataUrl.length > 0) {
          resolve(rawDataUrl);
        } else {
          resolve(compressed);
        }
      } catch {
        resolve(rawDataUrl);
      }
    };

    img.onerror = () => {
      resolve(rawDataUrl);
    };

    img.src = rawDataUrl;
  });
}
