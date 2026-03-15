import React, { useState } from 'react';
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import {
  preparePatschiBackendStandalone,
  prepareCrewDashboard,
  prepareReservationWidget,
  prepareGiftCardWidget,
  prepareJobsWidget,
  prepareTestUpload,
  calculateTotalSize,
  formatFileSize,
  uploadFiles,
  type FileItem,
  type UploadProgress,
} from '../lib/uploadHelpers';

interface FilePackageOption {
  id: string;
  name: string;
  description: string;
  files: string[];
  prepareFunction: () => Promise<FileItem[]>;
}

interface FileUploadManagerProps {
  hasConfiguration: boolean;
  defaultSelected?: string[];
}

export default function FileUploadManager({ hasConfiguration, defaultSelected }: FileUploadManagerProps) {
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set(defaultSelected ?? []));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const packages: FilePackageOption[] = [
    {
      id: 'test-upload',
      name: 'Test Upload (DIAGNOSTIC)',
      description: 'Simple test page to verify upload system is working',
      files: ['test-upload.html'],
      prepareFunction: prepareTestUpload,
    },
    {
      id: 'patschi-backend',
      name: 'Patschi Backend Complete',
      description: 'Complete admin interface with all features (React build)',
      files: ['patschi-admin.html', 'assets/ (7 files)'],
      prepareFunction: preparePatschiBackendStandalone,
    },
    {
      id: 'crew-dashboard',
      name: 'Crew Dashboard',
      description: 'Staff interface for managing reservations',
      files: ['crew.html', 'assets/ (7 files)', 'icons (2 files)'],
      prepareFunction: prepareCrewDashboard,
    },
    {
      id: 'reservation-widget',
      name: 'Reservation Widget',
      description: 'Customer-facing reservation form',
      files: ['reservation-widget.html'],
      prepareFunction: prepareReservationWidget,
    },
    {
      id: 'gift-card-widget',
      name: 'Gift Card Widget',
      description: 'Gift card purchase interface',
      files: ['gift-card-widget.html'],
      prepareFunction: prepareGiftCardWidget,
    },
    {
      id: 'jobs-widget',
      name: 'Offene Stellen Widget',
      description: 'Job listings widget for displaying open positions',
      files: ['jobs-widget.html'],
      prepareFunction: prepareJobsWidget,
    },
  ];

  const togglePackage = (packageId: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  const selectAll = () => {
    setSelectedPackages(new Set(packages.map((p) => p.id)));
  };

  const clearAll = () => {
    setSelectedPackages(new Set());
  };

  const handleUpload = async () => {
    if (selectedPackages.size === 0) return;

    setIsUploading(true);
    setUploadProgress({
      currentFile: 'Preparing files...',
      filesCompleted: 0,
      totalFiles: selectedPackages.size,
      percentage: 0,
      status: 'preparing',
    });
    setUploadResult(null);

    try {
      const allFiles: FileItem[] = [];

      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (pkg) {
          const files = await pkg.prepareFunction();
          allFiles.push(...files);
        }
      }

      await uploadFiles(allFiles, setUploadProgress);

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${allFiles.length} file(s) to your server!`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error.message || 'Upload failed. Please check your configuration and try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!hasConfiguration) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Configuration Required
            </h3>
            <p className="text-sm text-yellow-800">
              Please configure your hosting credentials above before uploading files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select which files to upload to your web server
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {packages.map((pkg) => {
          const isSelected = selectedPackages.has(pkg.id);

          return (
            <div
              key={pkg.id}
              onClick={() => !isUploading && togglePackage(pkg.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  disabled={isUploading}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">{pkg.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.files.map((file, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs text-gray-700 rounded"
                      >
                        <FileText className="w-3 h-3" />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={isUploading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={clearAll}
            disabled={isUploading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {selectedPackages.size} package{selectedPackages.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {uploadProgress && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {uploadProgress.currentFile}
            </span>
            <span className="text-sm text-gray-600">{uploadProgress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {uploadProgress.filesCompleted} of {uploadProgress.totalFiles} packages
            </span>
            <span className="capitalize">{uploadProgress.status}</span>
          </div>
        </div>
      )}

      {uploadResult && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            uploadResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm whitespace-pre-line ${
                  uploadResult.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {uploadResult.message}
              </p>
              {uploadResult.success && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-700">
                    Files are now available on your web server.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={selectedPackages.size === 0 || isUploading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload Selected Files
          </>
        )}
      </button>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">After Upload:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Files will be uploaded to your configured remote directory</li>
          <li>• HTML files can be accessed directly via your domain</li>
          <li>• Asset files will be in the assets/ subdirectory</li>
          <li>• All files are ready to use without additional configuration</li>
        </ul>
      </div>
    </div>
  );
}
