import React from 'react';
import { uploadAttachment, removeAttachmentObject, renameAttachment } from '@api/attachments';

type Attachment = { id: string; name?: string; url?: string; mime?: string; size?: number; created_at?: string };

type Props = {
  attachments: Attachment[];
  onRemove: (id: string) => Promise<void> | void;
  workspaceId?: string;
  cardId?: string;
  onUploaded?: () => Promise<void> | void;
  registerOpenPicker?: (fn: () => void) => void;
};

export default function AttachmentList({ attachments, onRemove, workspaceId, cardId, onUploaded, registerOpenPicker }: Props) {
  const [pending, setPending] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<{[key: string]: number}>({});
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);

  const handleFileUpload = async (files: FileList) => {
    if (!workspaceId || !cardId) return;
    
    // Clear any previous error messages
    setErrorMessage('');
    setPending(true);
    const fileArray = Array.from(files);
    
    try {
      for (const file of fileArray) {
        const fileId = `${Date.now()}_${file.name}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        try {
          // Simulate progress for better UX
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev[fileId] || 0;
              if (current < 90) {
                return { ...prev, [fileId]: current + 10 };
              }
              return prev;
            });
          }, 200);

          await uploadAttachment(workspaceId, cardId, file);
          
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          
          // Remove from progress after a short delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
              return newProgress;
            });
          }, 1000);
        } catch (error) {
          console.error('Failed to upload file:', file.name, error);
          
          // Clear progress for failed file
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
          
          // Show user-friendly error message
          if (error instanceof Error) {
            if (error.message.includes('Bucket not found')) {
              setErrorMessage('Storage not configured. Please contact your administrator to set up file uploads.');
            } else if (error.message.includes('File size')) {
              setErrorMessage('File too large. Please upload files smaller than 50MB.');
            } else if (error.message.includes('File type')) {
              setErrorMessage('File type not supported. Please try a different file.');
            } else {
              setErrorMessage(`Upload failed: ${error.message}`);
            }
          } else {
            setErrorMessage('Upload failed. Please try again.');
          }
          
          // Clear error after 5 seconds
          setTimeout(() => setErrorMessage(''), 5000);
        }
      }
      
      await onUploaded?.();
    } finally {
      setPending(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  React.useEffect(() => {
    if (!registerOpenPicker) return;
    registerOpenPicker(() => fileRef.current?.click());
  }, [registerOpenPicker]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${pending ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onClick={() => fileRef.current?.click()}
      >
        <div className="space-y-2">
          <div className={`mx-auto w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'} transition-colors`}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-medium ${isDragging ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {isDragging ? 'Drop files here' : 'Drop files or click to browse'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports images, documents, and other file types
            </p>
          </div>
        </div>
        
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">Upload Failed</p>
              <p className="text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {fileId.split('_').slice(1).join('_')}
                </span>
                <span className="text-gray-500 text-xs">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Attachments</h4>
          {attachments.map((a) => (
            <div key={a.id} className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* File type icon */}
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                      {a.mime?.startsWith('image/') ? (
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      ) : a.mime?.includes('pdf') ? (
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm8 2H8v1h4V6zM8 9v1h4V9H8zm4 3H8v1h4v-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {a.name || 'Attachment'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(a.size)}
                        {a.created_at && ` • ${new Date(a.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 rounded transition-colors"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={async () => {
                      const newName = window.prompt('New name', a.name || '')?.trim();
                      if (!newName || newName === a.name) return;
                      setPending(true);
                      try {
                        await renameAttachment(a.id, newName);
                        await onUploaded?.();
                      } finally {
                        setPending(false);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
                  >
                    Rename
                  </button>
                  {a.url && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(a.url!);
                        } catch (error) {
                          console.error('Failed to copy URL:', error);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300 rounded transition-colors"
                    >
                      Copy
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (a.url) await removeAttachmentObject(a.url);
                      await onRemove(a.id);
                    }}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handleFileUpload(e.target.files);
        }}
      />
    </div>
  );
}