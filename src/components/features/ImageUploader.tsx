import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
  disabled?: boolean;
}

export function ImageUploader({ onImageSelect, selectedImage, disabled }: ImageUploaderProps) {
  const [draggingOver, setDraggingOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Keep preview in sync with selectedImage
  useEffect(() => {
    if (!selectedImage) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  // Window-level drag listeners — show overlay whenever a file is dragged anywhere
  const onWindowDragEnter = useCallback((e: DragEvent) => {
    if (disabled) return;
    if (e.dataTransfer?.types.includes('Files')) {
      dragCounterRef.current += 1;
      setDraggingOver(true);
    }
  }, [disabled]);

  const onWindowDragLeave = useCallback(() => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDraggingOver(false);
    }
  }, []);

  const onWindowDrop = useCallback((e: DragEvent) => {
    dragCounterRef.current = 0;
    setDraggingOver(false);
    if (disabled) return;
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const onWindowDragOver = useCallback((e: DragEvent) => {
    e.preventDefault(); // required so drop fires
  }, []);

  useEffect(() => {
    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);
    window.addEventListener('dragover', onWindowDragOver);
    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
      window.removeEventListener('dragover', onWindowDragOver);
    };
  }, [onWindowDragEnter, onWindowDragLeave, onWindowDrop, onWindowDragOver]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onImageSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Thumbnail preview (shown when an image is selected) */}
      {preview && (
        <div className="relative inline-flex items-center mb-2">
          <img
            src={preview}
            alt="Selected screenshot"
            className="h-16 w-auto rounded-lg border border-gray-200 shadow-sm object-cover"
          />
          <button
            type="button"
            onClick={() => onImageSelect(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-red-500 transition-colors"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Paperclip icon button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        aria-label="Attach image"
        title="Attach screenshot"
      >
        {/* Paperclip SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      {/* Full-screen drag-over overlay */}
      {draggingOver && (
        <div className="fixed inset-0 z-50 bg-blue-500/10 backdrop-blur-[2px] border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-lg font-semibold text-gray-800">Drop your screenshot</p>
            <p className="text-sm text-gray-500">Release to attach the image</p>
          </div>
        </div>
      )}
    </>
  );
}
