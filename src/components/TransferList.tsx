import React from 'react';
import { FileTransfer } from '../types';
import { File, FileImage, FileText, FileArchive, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';

interface TransferListProps {
  transfers: FileTransfer[];
}

export function TransferList({ transfers }: TransferListProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <FileImage className="w-8 h-8" />;
    }
    if (type.startsWith('text/')) {
      return <FileText className="w-8 h-8" />;
    }
    if (type.startsWith('application/pdf')) {
      return <FileText className="w-8 h-8" />;
    }
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) {
      return <FileArchive className="w-8 h-8" />;
    }
    return <File className="w-8 h-8" />;
  };

  const getStatusIcon = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'waiting':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <File className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleDownload = (transfer: FileTransfer) => {
    if (transfer.status !== 'completed' || !transfer.fileData) return;

    const blob = new Blob([transfer.fileData], { type: transfer.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {transfers.map((transfer) => (
        <div
          key={transfer.id}
          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${
                transfer.status === 'completed' ? 'bg-green-100' :
                transfer.status === 'error' ? 'bg-red-100' :
                transfer.status === 'waiting' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {getFileIcon(transfer.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">{transfer.name}</h4>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(transfer.status)}
                    {transfer.status === 'completed' && transfer.fileData && (
                      <button
                        onClick={() => handleDownload(transfer)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Download file"
                      >
                        <Download className="w-5 h-5 text-blue-500" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">{formatSize(transfer.size)}</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-500">{transfer.type.split('/')[1].toUpperCase()}</span>
                </div>
                {transfer.status === 'transferring' && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${transfer.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 mt-1">{transfer.progress.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}