import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileUpload } from '@/components/ui/file-upload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Sparkles, Target, Gamepad2, Palette, Crown, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { analyzeImageOnClient, determinePersonalityFromFeatures } from '@/lib/imageAnalyzer';
import type { Categorization } from '@shared/schema';

export default function Home() {
  const [result, setResult] = useState<Categorization | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const categorizeMutation = useMutation({
    mutationFn: async ({ file, gender }: { file: File; gender: 'male' | 'female' }) => {
      // Analyze image on client side (like Teachable Machine)
      console.log('Analyzing image on client side...');
      const imageFeatures = await analyzeImageOnClient(file);
      console.log('Image features:', imageFeatures);
      
      // Check if it's a portrait photo with detected face
      if (!imageFeatures.faceDetected) {
        throw new Error('NOT_PORTRAIT');
      }
      
      // Determine personality based on features
      const personalityType = determinePersonalityFromFeatures(imageFeatures, gender);
      console.log('Selected personality:', personalityType);
      
      // Double check - personality function also validates face detection
      if (!personalityType) {
        throw new Error('NOT_PORTRAIT');
      }
      
      // Send analysis results to server for response generation
      const formData = new FormData();
      formData.append('image', file);
      formData.append('gender', gender);
      formData.append('language', language);
      formData.append('analysisResult', personalityType);
      formData.append('imageFeatures', JSON.stringify(imageFeatures));
      
      const response = await apiRequest('POST', '/api/categorize', formData);
      return response.json() as Promise<Categorization>;
    },
    onSuccess: (data) => {
      setResult(data);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      
      // Handle non-portrait image error specifically with humor
      if (error.message === 'NOT_PORTRAIT') {
        const humorousMessages = {
          ko: [
            "어? 이건 사람이 아니네요! 🤔 AI가 당황했어요. 본인 얼굴이 나온 사진을 올려주세요!",
            "앗! 풍경이나 음식 사진은 성격을 알 수 없어요 😅 사람 얼굴이 보이는 사진으로 다시 시도해주세요!",
            "이런! 강아지나 고양이는 분석할 수 없어요 🐱 사람 얼굴 사진을 업로드해주세요!",
            "음... 이 사진에선 얼굴을 찾을 수 없네요 🔍 셀카나 프로필 사진으로 다시 도전해보세요!",
            "어머! 사물이나 풍경은 성격이 없답니다 😄 사람이 나온 사진을 올려주세요!",
            "앗! 메일링 이미지나 로고는 분석할 수 없어요 📧 진짜 사람 얼굴 사진을 올려주세요!",
            "어라? AI가 얼굴을 못 찾겠다고 하네요 🫤 더 선명한 인물 사진으로 다시 시도해보세요!",
            "이건 뭔가 이상해요... 🧐 사람 얼굴이 크게 나온 사진을 업로드해주세요!",
            "음! 얼굴이나 상반신이 나온 사진이 필요해요 📸 전신샷은 얼굴이 너무 작아서 정확한 분석이 어려워요!",
            "어! 더 가까운 사진이 필요해요 🎯 얼굴이 선명하게 보이는 프로필이나 상반신 사진을 올려주세요!"
          ],
          en: [
            "Oops! This isn't a person! 🤔 AI is confused. Please upload a photo with your face!",
            "Ah! We can't analyze landscapes or food photos 😅 Please try again with a portrait photo!",
            "Hmm! We need a close-up or half-body shot 📸 Full-body photos make faces too small to analyze accurately!",
            "Hey! For better results, please upload a portrait or upper-body photo 🎯 Your face should be clearly visible!",
            "Oh no! We can't analyze dogs or cats 🐱 Please upload a human face photo!",
            "Hmm... We can't find a face in this photo 🔍 Try a selfie or profile picture!",
            "Oh my! Objects and landscapes don't have personalities 😄 Please upload a photo with a person!",
            "Oops! We can't analyze mailing images or logos 📧 Please upload a real human face photo!",
            "Hmm? AI can't find a face here 🫤 Try again with a clearer portrait photo!",
            "This looks suspicious... 🧐 Please upload a photo with a person's face clearly visible!"
          ]
        };
        
        const messages = humorousMessages[language];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        toast({
          title: language === 'ko' ? "사람 얼굴이 필요해요!" : "We need a human face!",
          description: randomMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: language === 'ko' ? "분석 실패" : "Analysis failed",
          description: language === 'ko' ? "다른 이미지로 다시 시도해주세요." : "Please try again with a different image.",
          variant: "destructive"
        });
      }
      setIsProcessing(false);
    }
  });

  const handleFileSelect = (file: File) => {
    console.log('handleFileSelect called with file:', file);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    
    // Additional mobile file validation
    if (!file) {
      console.error('No file selected');
      return;
    }
    
    // Validate file type again for mobile compatibility
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: language === 'ko' ? "파일 형식 오류" : "File Format Error",
        description: language === 'ko' 
          ? "JPG, PNG, GIF, WebP 형식만 지원합니다." 
          : "Only JPG, PNG, GIF, WebP formats are supported.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: language === 'ko' ? "파일 크기 오류" : "File Size Error",
        description: language === 'ko' 
          ? "파일 크기는 20MB 이하여야 합니다." 
          : "File size must be under 20MB.",
        variant: "destructive"
      });
      return;
    }
    
    setLastUploadedFile(file);
    setIsProcessing(true);
    setResult(null);
    
    // Create image preview URL (temporary, not saved)
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    console.log('Image preview URL created:', previewUrl);
    
    // If no gender selected, use 'random' to let server decide
    const genderToUse = selectedGender || 'random';
    console.log('Starting analysis with gender:', genderToUse);
    
    // Add a small delay for better mobile UX
    setTimeout(() => {
      categorizeMutation.mutate({ file, gender: genderToUse as 'male' | 'female' });
    }, 100);
  };

  const handleReanalyzeWithGender = (newGender: 'male' | 'female' | null) => {
    if (!lastUploadedFile) return;
    
    setSelectedGender(newGender);
    setIsProcessing(true);
    setResult(null);
    
    const genderToUse = newGender || 'random';
    categorizeMutation.mutate({ file: lastUploadedFile, gender: genderToUse as 'male' | 'female' });
    
    toast({
      title: language === 'ko' ? "재분석 시작!" : "Reanalyzing!",
      description: language === 'ko' ? "같은 사진을 새로운 설정으로 분석중이에요" : "Analyzing the same photo with new settings"
    });
  };

  const generateShareImage = async (result: Categorization) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Canvas 크기 설정 (Instagram 정사각형 비율)
    canvas.width = 1080;
    canvas.height = 1080;
    
    // 배경 그라데이션
    const categoryInfo = getCategoryInfo(result.category);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    
    // 성격별 색상
    if (result.category === 'tetoman') {
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1E40AF');
    } else if (result.category === 'egenman') {
      gradient.addColorStop(0, '#10B981');
      gradient.addColorStop(1, '#047857');
    } else if (result.category === 'tetowoman') {
      gradient.addColorStop(0, '#F59E0B');
      gradient.addColorStop(1, '#D97706');
    } else {
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(1, '#6D28D9');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 반투명 오버레이
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 텍스트 스타일
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    
    // 제목
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.fillText('PicPersona', canvas.width / 2, 150);
    
    // 이모지
    ctx.font = '200px Arial';
    ctx.fillText(categoryInfo?.emoji || '🎭', canvas.width / 2, 350);
    
    // 성격 유형
    ctx.font = 'bold 100px Arial, sans-serif';
    const categoryName = language === 'ko' 
      ? (texts.categories[result.category as keyof typeof texts.categories] as any)?.name || result.category
      : result.category.toUpperCase();
    ctx.fillText(categoryName, canvas.width / 2, 500);
    
    // 메시지 (짧게 편집)
    ctx.font = '40px Arial, sans-serif';
    const shortMessage = result.message.length > 60 
      ? result.message.substring(0, 60) + '...'
      : result.message;
    
    // 텍스트 줄바꿈
    const words = shortMessage.split(' ');
    let line = '';
    let y = 600;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > 900 && n > 0) {
        ctx.fillText(line.trim(), canvas.width / 2, y);
        line = words[n] + ' ';
        y += 50;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), canvas.width / 2, y);
    
    // 하단 텍스트
    ctx.font = '35px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(
      language === 'ko' ? '나도 PicPersona에서 분석해보기!' : 'Try PicPersona yourself!',
      canvas.width / 2,
      canvas.height - 100
    );
    
    return canvas.toDataURL('image/png');
  };

  const handleShareImage = async () => {
    if (!result) return;
    
    try {
      const imageDataUrl = await generateShareImage(result);
      
      // 이미지를 Blob으로 변환
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      if (navigator.share && navigator.canShare({ files: [new File([blob], 'picpersona-result.png', { type: 'image/png' })] })) {
        // 네이티브 공유 API 사용
        const file = new File([blob], 'picpersona-result.png', { type: 'image/png' });
        await navigator.share({
          title: language === 'ko' ? 'PicPersona 결과' : 'PicPersona Result',
          text: language === 'ko' ? '내 성격 분석 결과를 확인해보세요!' : 'Check out my personality analysis!',
          files: [file]
        });
      } else {
        // 다운로드 링크 생성
        const link = document.createElement('a');
        link.download = 'picpersona-result.png';
        link.href = imageDataUrl;
        link.click();
        
        toast({
          title: language === 'ko' ? "이미지 다운로드 완료!" : "Image downloaded!",
          description: language === 'ko' ? "갤러리에서 확인하고 공유하세요!" : "Check your gallery and share!"
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: language === 'ko' ? "공유 실패" : "Share failed",
        description: language === 'ko' ? "다시 시도해주세요" : "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    
    const shareText = `${language === 'ko' ? '내 PicPersona 결과: ' : 'My PicPersona result: '}${
      language === 'ko' 
        ? (texts.categories[result.category as keyof typeof texts.categories] as any)?.name || result.category
        : result.category.toUpperCase()
    }! 🎭\n\n${result.message}\n\n${language === 'ko' ? 'PicPersona에서 당신의 성격도 확인해보세요!' : 'Check out yours at PicPersona!'}`;
    
    navigator.clipboard?.writeText(shareText);
    toast({
      title: language === 'ko' ? "텍스트 복사 완료!" : "Text copied!",
      description: language === 'ko' ? "어디든 붙여넣기 하세요!" : "Paste anywhere to share!"
    });
  };

  const getTexts = () => {
    if (language === 'ko') {
      return {
        title: "PicPersona",
        hero: {
          title: "테토vs에겐, 나는 누구?! ✨",
          subtitle: "😎 사진 한 장으로 나의 분위기 성향 분석 완료!",
        },
        genderSelection: "더 정확한 결과를 원한다면 성별을 선택하세요 (선택사항)",
        genderOptions: {
          female: "👩 여성",
          male: "👨 남성",
          random: "🎲 랜덤"
        },
        processing: {
          title: "AI가 당신의 성격을 분석중입니다",
          subtitle: "브라우저에서 안전하게 이미지를 분석하고 있어요",
          waiting: "잠시만 기다려주세요..."
        },
        result: {
          youAre: "당신은",
          shareButton: "결과 공유하기",
          tryAgainButton: "다른 사진으로 시도",
          funFactsTitle: "재밌는 사실들:",
          shareText: "내 프로필 사진 성격: "
        },
        categories: {
          title: "네 가지 성격 유형을 만나보세요",
          tetoman: {
            name: "테토남",
            description: "리더십이 강하고 주도적인 성격! 직설적이고 당당한 매력으로 자유롭고 힙한 스타일을 추구하는 타입"
          },
          egenman: {
            name: "에겐남", 
            description: "조용하고 부드러운 분위기의 다정한 남사친! 섬세하고 배려심 많은 감성적 매력의 소유자"
          },
          tetowoman: {
            name: "테토녀",
            description: "솔직하고 주도적인 쿨한 성격! 감정을 직설적으로 표현하고 갈등도 정면 돌파하는 당당한 매력"
          },
          egenwoman: {
            name: "에겐녀",
            description: "눈치가 빠르고 섬세한 예술가! 공기 흐름을 잘 읽고 조화로운 스타일링을 추구하는 소녀스러운 매력"
          }
        },
        howItWorks: {
          title: "어떻게 작동하나요?",
          step1: {
            title: "1. 업로드",
            description: "좋아하는 프로필 사진을 드래그하거나 선택하세요"
          },
          step2: {
            title: "2. 분석",
            description: "AI가 사진의 성격 특성과 분위기를 분석합니다"
          },
          step3: {
            title: "3. 발견",
            description: "성격 유형과 재미있는 사실들을 확인하고 친구들과 공유하세요!"
          }
        }
      };
    } else {
      return {
        title: "PicPersona",
        hero: {
          title: "Discover Your Profile Personality",
          subtitle: "Upload your profile picture and let our AI reveal whether you're a Tetoman, Egenman, Tetowoman, or Egenwoman!",
        },
        genderSelection: "Select your gender for more accurate results (optional)",
        genderOptions: {
          female: "👩 Female",
          male: "👨 Male", 
          random: "🎲 Random"
        },
        processing: {
          title: "AI is analyzing your personality",
          subtitle: "Analyzing your image safely in your browser",
          waiting: "Please wait a moment..."
        },
        result: {
          youAre: "You're a",
          shareButton: "Share My Result",
          tryAgainButton: "Try Another Photo",
          funFactsTitle: "Fun Facts About",
          shareText: "I just discovered my profile picture personality: "
        },
        categories: {
          title: "Meet the Four Personalities",
          tetoman: {
            name: "Tetoman",
            description: "The superhero of profile pics! Always saving the day with epic poses."
          },
          egenman: {
            name: "Egenman",
            description: "The tech wizard! Gaming skills on point and always leveling up."
          },
          tetowoman: {
            name: "Tetowoman", 
            description: "The life of the party! Turns any moment into a celebration."
          },
          egenwoman: {
            name: "Egenwoman",
            description: "The creative genius! Art, style, and sophistication rolled into one."
          }
        },
        howItWorks: {
          title: "How It Works",
          step1: {
            title: "1. Upload",
            description: "Drop your favorite profile picture or choose from your device"
          },
          step2: {
            title: "2. Analyze", 
            description: "Our AI analyzes your photo's personality traits and vibes"
          },
          step3: {
            title: "3. Discover",
            description: "Get your personality type with fun facts and share with friends!"
          }
        }
      };
    }
  };

  const texts = getTexts();

  const handleTryAgain = () => {
    setResult(null);
    setIsProcessing(false);
    setSelectedGender(null);
    
    // Clean up image preview URL to free memory
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setLastUploadedFile(null);
  };

  const handleShare = () => {
    if (result) {
      const text = `I just discovered my profile picture personality: ${result.category.toUpperCase()}! ${result.message}`;
      if (navigator.share) {
        navigator.share({
          title: 'My PicPersona Result',
          text: text,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard!",
          description: "Share your result with friends!"
        });
      }
    }
  };

  const getCategoryInfo = (category: string) => {
    const categoryMaps = {
      ko: {
        tetoman: {
          emoji: '🎯',
          color: 'blue',
          traits: ['✨ 럭키비키', '💪 GMG정신', '⚡ 원영적사고'],
          bgClass: 'from-blue-400 to-blue-600',
          cardBg: 'bg-blue-50',
          textColor: 'text-blue-600'
        },
        egenman: {
          emoji: '🎮',
          color: 'green',
          traits: ['🔧 전문성중시', '💻 HMH정신', '🏆 갓생살기'],
          bgClass: 'from-green-400 to-green-600',
          cardBg: 'bg-green-50',
          textColor: 'text-green-600'
        },
        tetowoman: {
          emoji: '🎊',
          color: 'purple',
          traits: ['🌈 행집욕부', '✨ 낭만리부트', '💃 분위기메이커'],
          bgClass: 'from-purple-400 to-purple-600',
          cardBg: 'bg-purple-50',
          textColor: 'text-purple-600'
        },
        egenwoman: {
          emoji: '💫',
          color: 'pink',
          traits: ['🎨 추구미확고', '👗 케미중시', '🌟 감성큐레이팅'],
          bgClass: 'from-pink-400 to-pink-600',
          cardBg: 'bg-pink-50',
          textColor: 'text-pink-600'
        }
      },
      en: {
        tetoman: {
          emoji: '🦸‍♂️',
          color: 'blue',
          traits: ['💪 Heroic', '🎯 Confident', '⚡ Dynamic'],
          bgClass: 'from-blue-400 to-blue-600',
          cardBg: 'bg-blue-50',
          textColor: 'text-blue-600'
        },
        egenman: {
          emoji: '🤖',
          color: 'green',
          traits: ['🎮 Gamer', '💻 Tech-savvy', '🚀 Innovative'],
          bgClass: 'from-green-400 to-green-600',
          cardBg: 'bg-green-50',
          textColor: 'text-green-600'
        },
        tetowoman: {
          emoji: '💃',
          color: 'purple',
          traits: ['🎉 Party Queen', '✨ Energetic', '💫 Inspiring'],
          bgClass: 'from-purple-400 to-purple-600',
          cardBg: 'bg-purple-50',
          textColor: 'text-purple-600'
        },
        egenwoman: {
          emoji: '👑',
          color: 'pink',
          traits: ['🎨 Creative', '👗 Stylish', '🌟 Elegant'],
          bgClass: 'from-pink-400 to-pink-600',
          cardBg: 'bg-pink-50',
          textColor: 'text-pink-600'
        }
      }
    };
    const categoryMap = categoryMaps[language];
    return categoryMap[category as keyof typeof categoryMap];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => {
                setResult(null);
                setIsProcessing(false);
                setSelectedGender(null);
                setLastUploadedFile(null);
                if (imagePreview) {
                  URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center animate-float">
                <Camera className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {texts.title}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLanguage('ko')}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    language === 'ko' 
                      ? 'bg-white text-primary shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  한글
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                    language === 'en' 
                      ? 'bg-white text-primary shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  EN
                </button>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors duration-200">
                  {language === 'ko' ? '사용방법' : 'How It Works'}
                </a>
                <a href="#categories" className="text-gray-600 hover:text-primary transition-colors duration-200">
                  {language === 'ko' ? '성격유형' : 'Categories'}
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {texts.hero.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {texts.hero.subtitle} {language === 'ko' ? '' : 'Get ready for some laughs! 😄'}
          </p>
        </div>

        {/* Upload Area or Result */}
        <div className="max-w-2xl mx-auto mb-16">
          {!result && !isProcessing && (
            <>
              {/* Gender Selection - Above Upload */}
              <div className="mb-6 text-center">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setSelectedGender('female')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedGender === 'female'
                        ? 'bg-gray-200 text-gray-700 border border-gray-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {texts.genderOptions.female}
                  </button>
                  <button
                    onClick={() => setSelectedGender('male')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedGender === 'male'
                        ? 'bg-gray-200 text-gray-700 border border-gray-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {texts.genderOptions.male}
                  </button>
                  <button
                    onClick={() => setSelectedGender(null)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedGender === null
                        ? 'bg-gray-200 text-gray-700 border border-gray-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {texts.genderOptions.random}
                  </button>
                </div>
              </div>
              
              <FileUpload onFileSelect={handleFileSelect} language={language} />
            </>
          )}

          {/* Loading State */}
          {isProcessing && (
            <Card className="p-12 text-center bg-white shadow-lg">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-8">
                  <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-lg border-4 border-gray-100">
                    <img 
                      src={imagePreview} 
                      alt={language === 'ko' ? '업로드된 이미지' : 'Uploaded image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    {language === 'ko' ? '업로드된 이미지' : 'Uploaded Image'}
                  </p>
                </div>
              )}
              
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center animate-spin-slow">
                <Sparkles className="text-white w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{texts.processing.title}</h3>
              <p className="text-gray-600 mb-6">{texts.processing.subtitle}</p>
              
              <div className="flex justify-center space-x-2 mb-6">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-3 h-3 bg-secondary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
              
              <div className="text-sm text-gray-500">
                {texts.processing.waiting}
              </div>
            </Card>
          )}

          {/* Result Display */}
          {result && (
            <Card className="p-8 md:p-12 shadow-2xl bg-white">
              <div className="text-center mb-8">
                {(() => {
                  const categoryInfo = getCategoryInfo(result.category);
                  return (
                    <>
                      {/* Show uploaded image like JoCoding animal face test */}
                      {imagePreview && (
                        <div className="mb-8">
                          <div className="w-48 h-48 md:w-56 md:h-56 mx-auto rounded-3xl overflow-hidden shadow-xl border-4 border-gray-200">
                            <img 
                              src={imagePreview} 
                              alt={language === 'ko' ? '분석된 이미지' : 'Analyzed image'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className={`w-32 h-32 mx-auto mb-6 bg-gradient-to-r ${categoryInfo?.bgClass} rounded-full flex items-center justify-center text-6xl animate-bounce-slow`}>
                        {categoryInfo?.emoji}
                      </div>
                      
                      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {texts.result.youAre} <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent capitalize">
                          {language === 'ko' ? (texts.categories[result.category as keyof typeof texts.categories] as any)?.name || result.category : result.category}
                        </span>! 🎉
                      </h2>
                      
                      <div className={`${categoryInfo?.cardBg} rounded-2xl p-6 mb-8`}>
                        <p className="text-lg text-gray-700 font-medium mb-4">
                          {result.message}
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-3 mb-6">
                          {categoryInfo?.traits.map((trait, index) => (
                            <span key={index} className={`${categoryInfo.cardBg.replace('bg-', 'bg-').replace('-50', '-100')} ${categoryInfo.textColor} px-4 py-2 rounded-full font-medium`}>
                              {trait}
                            </span>
                          ))}
                        </div>
                        
                        <div className="bg-white rounded-xl p-4">
                          <h4 className="font-bold text-gray-900 mb-2">
                            {texts.result.funFactsTitle} {language === 'ko' ? (texts.categories[result.category as keyof typeof texts.categories] as any)?.name || result.category : result.category.charAt(0).toUpperCase() + result.category.slice(1)}:
                          </h4>
                          <ul className="text-left text-sm text-gray-700 space-y-1">
                            {result.funFacts.map((fact, index) => (
                              <li key={index}>• {fact}</li>
                            ))}
                          </ul>
                        </div>

                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                          onClick={handleShareImage}
                        >
                          <Download className="w-5 h-5 mr-2" />
                          {language === 'ko' ? '🖼️ 이미지로 공유' : '🖼️ Share Image'}
                        </Button>
                        
                        <Button 
                          className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                          onClick={handleCopyResult}
                        >
                          <Copy className="w-5 h-5 mr-2" />
                          {language === 'ko' ? '📝 텍스트 복사' : '📝 Copy Text'}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-200"
                          onClick={() => {
                            setResult(null);
                            setIsProcessing(false);
                            setLastUploadedFile(null);
                          }}
                        >
                          <RefreshCw className="w-5 h-5 mr-2" />
                          {texts.result.tryAgainButton}
                        </Button>
                      </div>
                      
                      {/* Gender correction option */}
                      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                        <p className="text-sm text-gray-700 mb-3 text-center font-medium">
                          {language === 'ko' 
                            ? '더 정확한 결과를 원하시나요? 성별을 선택하면 맞춤 분석이 가능해요! ✨' 
                            : 'Want more personalized results? Select your gender for customized analysis! ✨'}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleReanalyzeWithGender('female')}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedGender === 'female'
                                ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {language === 'ko' ? '👩 여성으로 재분석' : '👩 Female Analysis'}
                          </button>
                          <button
                            onClick={() => handleReanalyzeWithGender('male')}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedGender === 'male'
                                ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {language === 'ko' ? '👨 남성으로 재분석' : '👨 Male Analysis'}
                          </button>
                          <button
                            onClick={() => handleReanalyzeWithGender(null)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedGender === null
                                ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {language === 'ko' ? '🎲 랜덤 재분석' : '🎲 Random Analysis'}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>
          )}
        </div>

        {/* Category Preview */}
        <section id="categories" className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {texts.categories.title} 🎭
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(texts.categories).filter(([key]) => key !== 'title').map(([categoryKey, categoryData]) => {
              const categoryInfo = getCategoryInfo(categoryKey);
              return (
                <Card key={categoryKey} className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                  <div className="text-center">
                    <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-r ${categoryInfo?.bgClass} rounded-full flex items-center justify-center text-3xl animate-float`}>
                      {categoryInfo?.emoji}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{(categoryData as any).name}</h4>
                    <p className="text-gray-600 text-sm mb-4">{(categoryData as any).description}</p>
                    <div className={`${categoryInfo?.cardBg} rounded-2xl p-3`}>
                      <span className={`${categoryInfo?.textColor} font-medium text-sm`}>
                        {categoryInfo?.traits.join(' • ')}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-16">
          <Card className="p-8 md:p-12">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
              {texts.howItWorks.title} 🔮
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-3xl animate-float">
                  <Camera className="text-white w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{texts.howItWorks.step1.title}</h4>
                <p className="text-gray-600">{texts.howItWorks.step1.description}</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center text-3xl animate-float" style={{animationDelay: '0.5s'}}>
                  <Target className="text-white w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{texts.howItWorks.step2.title}</h4>
                <p className="text-gray-600">{texts.howItWorks.step2.description}</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-accent to-success rounded-full flex items-center justify-center text-3xl animate-float" style={{animationDelay: '1s'}}>
                  🎉
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{texts.howItWorks.step3.title}</h4>
                <p className="text-gray-600">{texts.howItWorks.step3.description}</p>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'ko' ? '테토vs에겐' : 'Teto vs Egen'}
          </h3>
          <p className="text-gray-600 mb-8">
            {language === 'ko' 
              ? '사진 한 장으로 분석하는 나의 분위기 성향! 🎭' 
              : 'Analyze your personality with just one photo! 🎭'}
          </p>

          {/* Footer Links */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <a 
                href="https://kindtoolai.replit.app/about" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                {language === 'ko' ? '사이트 소개' : 'About'}
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="https://kindtoolai.replit.app/disclaimer" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                {language === 'ko' ? '면책조항' : 'Disclaimer'}
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="https://kindtoolai.replit.app/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="https://kindtoolai.replit.app/terms-of-service" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                {language === 'ko' ? '이용약관' : 'Terms of Service'}
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="https://kindtoolai.replit.app/contact" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                {language === 'ko' ? '문의하기' : 'Contact'}
              </a>
            </div>
            
            <p className="text-gray-500 text-sm">
              © 2025 KindTool.ai - All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
