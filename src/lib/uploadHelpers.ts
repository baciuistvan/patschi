import { supabase } from './supabase';

export interface FilePackage {
  id: string;
  name: string;
  description: string;
  files: FileItem[];
}

export interface FileItem {
  remotePath: string;
  content: string;
  encoding?: string;
}

export interface UploadProgress {
  currentFile: string;
  filesCompleted: number;
  totalFiles: number;
  percentage: number;
  status: 'preparing' | 'uploading' | 'verifying' | 'completed' | 'error';
  error?: string;
}

export async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

function extractAssetPaths(htmlContent: string): string[] {
  const assetPaths: string[] = [];

  // Match script src and link href attributes that point to ./assets/
  const scriptRegex = /src="\.\/assets\/([^"]+)"/g;
  const linkRegex = /href="\.\/assets\/([^"]+)"/g;

  let match;
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    assetPaths.push(match[1]);
  }
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    assetPaths.push(match[1]);
  }

  return [...new Set(assetPaths)]; // Remove duplicates
}

export async function preparePatschiBackendStandalone(): Promise<FileItem[]> {
  const files: FileItem[] = [];

  try {
    // Fetch the latest built HTML (index.html from dist, now in public)
    const htmlContent = await fetchFileContent('/index.html');

    // Extract asset paths from HTML
    const assetPaths = extractAssetPaths(htmlContent);
    console.log('Found assets in HTML:', assetPaths);

    // Upload as patschi-admin.html to hosting root
    files.push({
      remotePath: 'patschi-admin.html',
      content: htmlContent,
    });

    // Fetch all referenced assets
    for (const assetPath of assetPaths) {
      try {
        const content = await fetchFileContent(`/assets/${assetPath}`);
        files.push({
          remotePath: `assets/${assetPath}`,
          content,
        });
      } catch (error) {
        console.warn(`Skipping asset ${assetPath}:`, error);
      }
    }

    return files;
  } catch (error) {
    console.error('Error preparing Patschi Backend Standalone:', error);
    throw new Error('Failed to prepare Patschi Backend files');
  }
}

export async function prepareCrewDashboard(): Promise<FileItem[]> {
  const files: FileItem[] = [];

  try {
    // Fetch the built crew dashboard HTML
    const htmlContent = await fetchFileContent('/crew.html');

    // Extract asset paths from HTML
    const assetPaths = extractAssetPaths(htmlContent);
    console.log('Found assets in crew.html:', assetPaths);

    files.push({
      remotePath: 'crew.html',
      content: htmlContent,
    });

    // Fetch all referenced assets
    for (const assetPath of assetPaths) {
      try {
        const content = await fetchFileContent(`/assets/${assetPath}`);
        files.push({
          remotePath: `assets/${assetPath}`,
          content,
        });
      } catch (error) {
        console.warn(`Skipping asset ${assetPath}:`, error);
      }
    }

    // Add crew icon files (referenced in HTML but not in assets folder)
    const iconFiles = ['crew-icon-180.png', 'crew-icon-512.png'];
    for (const iconFile of iconFiles) {
      try {
        const response = await fetch(`/${iconFile}`);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          const base64Content = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          files.push({
            remotePath: iconFile,
            content: base64Content.split(',')[1],
            encoding: 'base64',
          });
        }
      } catch (error) {
        console.warn(`Skipping icon ${iconFile}:`, error);
      }
    }

    return files;
  } catch (error) {
    console.error('Error preparing Crew Dashboard:', error);
    throw new Error('Failed to prepare Crew Dashboard files');
  }
}

export async function prepareTestUpload(): Promise<FileItem[]> {
  try {
    const htmlContent = await fetchFileContent('/test-upload.html');
    return [
      {
        remotePath: 'test-upload.html',
        content: htmlContent,
      },
    ];
  } catch (error) {
    console.error('Error preparing Test Upload:', error);
    throw new Error('Failed to prepare Test Upload file');
  }
}

export async function prepareReservationWidget(): Promise<FileItem[]> {
  try {
    const htmlContent = await fetchFileContent('/reservation-widget.html');
    return [
      {
        remotePath: 'reservation-widget.html',
        content: htmlContent,
      },
    ];
  } catch (error) {
    console.error('Error preparing Reservation Widget:', error);
    throw new Error('Failed to prepare Reservation Widget');
  }
}

export async function prepareGiftCardWidget(): Promise<FileItem[]> {
  try {
    const htmlContent = await fetchFileContent('/gift-card-widget.html');
    return [
      {
        remotePath: 'gift-card-widget.html',
        content: htmlContent,
      },
    ];
  } catch (error) {
    console.error('Error preparing Gift Card Widget:', error);
    throw new Error('Failed to prepare Gift Card Widget');
  }
}

export async function prepareJobsWidget(): Promise<FileItem[]> {
  try {
    const htmlContent = await fetchFileContent('/jobs-widget.html');
    return [
      {
        remotePath: 'jobs-widget.html',
        content: htmlContent,
      },
    ];
  } catch (error) {
    console.error('Error preparing Jobs Widget:', error);
    throw new Error('Failed to prepare Jobs Widget');
  }
}

export async function prepareEventsWidget(): Promise<FileItem[]> {
  try {
    const htmlContent = await fetchFileContent('/events-widget.html');
    return [
      {
        remotePath: 'events-widget.html',
        content: htmlContent,
      },
    ];
  } catch (error) {
    console.error('Error preparing Events Widget:', error);
    throw new Error('Failed to prepare Events Widget');
  }
}

export function calculateTotalSize(files: FileItem[]): number {
  return files.reduce((total, file) => {
    const size = new Blob([file.content]).size;
    return total + size;
  }, 0);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export async function uploadPdfToStorage(blob: Blob, giftCardCode: string): Promise<string> {
  const fileName = `gift-card-${giftCardCode}.pdf`;

  const { data, error } = await supabase.storage
    .from('gift-card-pdfs')
    .upload(fileName, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf'
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('gift-card-pdfs')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function uploadFiles(
  files: FileItem[],
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  const totalFiles = files.length;

  onProgress?.({
    currentFile: 'Preparing upload...',
    filesCompleted: 0,
    totalFiles,
    percentage: 0,
    status: 'preparing',
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    onProgress?.({
      currentFile: 'Connecting to server...',
      filesCompleted: 0,
      totalFiles,
      percentage: 5,
      status: 'uploading',
    });

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-hosting`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upload',
          files,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Check if any files failed
    if (result.results) {
      const failedFiles = result.results.filter((r: any) => r.status === 'failed');
      if (failedFiles.length > 0) {
        const errorDetails = failedFiles.map((f: any) => `${f.file}: ${f.error}`).join('\n');
        throw new Error(`Upload failed for ${failedFiles.length} file(s):\n${errorDetails}`);
      }
    }

    onProgress?.({
      currentFile: 'Upload completed',
      filesCompleted: totalFiles,
      totalFiles,
      percentage: 100,
      status: 'completed',
    });
  } catch (error: any) {
    onProgress?.({
      currentFile: '',
      filesCompleted: 0,
      totalFiles,
      percentage: 0,
      status: 'error',
      error: error.message || 'Upload failed',
    });
    throw error;
  }
}
