import React, { useCallback, useState } from 'react';
import { Upload, File as FileIcon } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      onFileSelect(e.dataTransfer.files);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files);
    }
  }, [onFileSelect]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`w-full p-8 border-3 border-dashed rounded-xl transition-all duration-300 ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-blue-500 bg-white'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className={`transition-transform duration-300 ${isDragging ? 'scale-110' : 'scale-100'}`}>
          <div className="bg-blue-100 p-4 rounded-full">
            {isDragging ? (
              <FileIcon className="w-12 h-12 text-blue-500" />
            ) : (
              <Upload className="w-12 h-12 text-blue-500" />
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-medium text-gray-700 mb-2">
            {isDragging ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <p className="text-gray-500 mb-4">or</p>
          <label className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg">
            <Upload className="w-5 h-5 mr-2" />
            Browse Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>
        <p className="text-sm text-gray-500 max-w-md text-center">
          Files will be shared securely using peer-to-peer encryption.
          No file size limits.
        </p>
      </div>
    </div>
  );
}