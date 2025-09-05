import {
  IconFile,
  IconFileText,
  IconPhoto,
  IconUpload,
  IconX,
  IconFileTypePdf,
} from '@tabler/icons-react';
import { FC, useCallback, useState, DragEvent } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile?: File | null;
  accept?: string;
  maxSize?: number;
  validateFile?: (file: File) => string | null;
}

export const FileUpload: FC<Props> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = '.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB default
  validateFile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');

  const doValidateFile = (file: File): string | null => {
    if (validateFile) return validateFile(file);
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
    }
    if (accept) {
      if (accept.includes('image') && !file.type.startsWith('image/')) {
        return 'Please select an image file';
      }
      if ((accept.includes('pdf') || accept.includes('.pdf')) && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        return 'Please select a PDF file';
      }
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError('');
    const validationError = doValidateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors shadow-card ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-blue-200 bg-white dark:border-[#1b2a4a] dark:bg-[#0f1d35]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-2">
            <IconUpload
              size={32}
              className={`${
                isDragging ? 'text-blue-500' : 'text-neutral-400'
              }`}
            />
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">Drag and drop</span> your file here, or{' '}
              <label className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                browse
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-500">
              Maximum file size: {formatFileSize(maxSize)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center space-x-3">
            {(() => {
              const n = selectedFile.name.toLowerCase();
              if (selectedFile.type.includes('pdf') || n.endsWith('.pdf')) {
                return <IconFileTypePdf size={20} className="text-red-600" />;
              }
              if (selectedFile.type.startsWith('image/')) {
                return <IconPhoto size={20} className="text-blue-600" />;
              }
              if (selectedFile.type.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.markdown')) {
                return <IconFileText size={20} className="text-green-600" />;
              }
              return <IconFile size={20} className="text-neutral-600" />;
            })()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {selectedFile.name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
          </div>
          <button
            onClick={onFileRemove}
            className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};
