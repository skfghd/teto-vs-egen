import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
  disabled?: boolean;
  language: 'ko' | 'en';
}

export function FileUpload({ onFileSelect, className, disabled, language }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 모바일 기기 감지
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || isTouchDevice);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
    setIsDragOver(false);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    // 모바일에서 드래그앤드롭 비활성화 (터치 이벤트와 충돌 방지)
    noClick: isMobile,
    noDrag: isMobile,
  });

  const handleCameraCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Camera file captured:', file);
      // 파일 타입과 크기 검증
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(language === 'ko' ? '지원하지 않는 파일 형식입니다.' : 'Unsupported file format.');
        event.target.value = '';
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(language === 'ko' ? '파일 크기는 20MB 이하여야 합니다.' : 'File size must be under 20MB.');
        event.target.value = '';
        return;
      }
      onFileSelect(file);
      // Reset input for multiple captures
      event.target.value = '';
    }
  }, [onFileSelect, language]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected from gallery:', file);
      // 파일 타입과 크기 검증
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(language === 'ko' ? '지원하지 않는 파일 형식입니다.' : 'Unsupported file format.');
        event.target.value = '';
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(language === 'ko' ? '파일 크기는 20MB 이하여야 합니다.' : 'File size must be under 20MB.');
        event.target.value = '';
        return;
      }
      onFileSelect(file);
      // Reset input for multiple selections
      event.target.value = '';
    }
  }, [onFileSelect, language]);

  const texts = {
    ko: {
      dragHere: "여기에 사진을 드래그하세요!",
      orClickMobile: "또는 버튼을 클릭해서 사진을 선택하거나 촬영하세요",
      orClickDesktop: "또는 버튼을 클릭해서 사진을 선택하세요",
      selectPhoto: "사진 선택",
      capturePhoto: "카메라로 촬영",
      fileSupport: "JPG, PNG, GIF 지원 • 최대 20MB"
    },
    en: {
      dragHere: "Drag your photo here!",
      orClickMobile: "Or click buttons to select or capture photo",
      orClickDesktop: "Or click button to select photo",
      selectPhoto: "Select Photo",
      capturePhoto: "Take Photo",
      fileSupport: "JPG, PNG, GIF supported • Max 20MB"
    }
  };

  return (
    <div
      {...(isMobile ? {} : getRootProps())}
      className={cn(
        "relative border-3 border-dashed border-primary/30 rounded-3xl p-12 text-center bg-white/50 backdrop-blur-sm hover:border-primary/50 hover:bg-white/70 transition-all duration-300 group",
        !isMobile && "cursor-pointer",
        isDragActive && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center animate-bounce-slow">
          <Upload className="text-white text-3xl w-8 h-8" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {isMobile ? "사진을 선택하거나 촬영하세요!" : texts[language].dragHere}
        </h3>
        <p className="text-gray-600 mb-6">
          {isMobile 
            ? texts[language].orClickMobile
            : texts[language].orClickDesktop
          }
        </p>
        
        {!isMobile && <input {...getInputProps()} />}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <label className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-2xl font-semibold text-base hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer inline-flex items-center justify-center active:scale-95">
            <Upload className="w-4 h-4 mr-2 inline" />
            {texts[language].selectPhoto}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
              multiple={false}
            />
          </label>
          
          {isMobile && (
            <label className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-2xl font-semibold text-base hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer inline-flex items-center justify-center active:scale-95">
              <Camera className="w-4 h-4 mr-2 inline" />
              {texts[language].capturePhoto}
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleCameraCapture}
                className="hidden"
                disabled={disabled}
                multiple={false}
              />
            </label>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          {texts[language].fileSupport}
        </div>
      </div>
    </div>
  );
}
