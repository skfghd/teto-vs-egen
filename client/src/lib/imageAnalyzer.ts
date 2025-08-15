// Client-side image analysis without external API calls
// Similar to JoCoding's animal face test approach

export interface ImageFeatures {
  brightness: number;
  contrast: number;
  colorfulness: number;
  dominantColor: 'warm' | 'cool' | 'neutral';
  faceDetected: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  aspectRatio: number;
  faceConfidence: number;  // New: face detection confidence score (0-1)
  edgeDetection: number;   // New: edge detection for facial structure
}

export function analyzeImageOnClient(imageFile: File): Promise<ImageFeatures> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Use standard 224x224 size like Teachable Machine for consistency
      canvas.width = 224;
      canvas.height = 224;
      
      // Draw image on canvas with proper scaling and centering
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      // Clear canvas and draw centered image
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Analyze image features
      const features = extractImageFeatures(data, canvas.width, canvas.height, imageFile.size);
      resolve(features);
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}

function extractImageFeatures(data: Uint8ClampedArray, width: number, height: number, fileSize: number): ImageFeatures {
  let totalBrightness = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  let brightPixels = 0;
  let darkPixels = 0;
  
  // Analyze each pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate brightness (luminance)
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
    totalBrightness += brightness;
    
    totalR += r;
    totalG += g;
    totalB += b;
    
    if (brightness > 180) brightPixels++;
    if (brightness < 60) darkPixels++;
  }
  
  const pixelCount = data.length / 4;
  const avgBrightness = totalBrightness / pixelCount;
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  
  // Calculate contrast
  let contrastSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
    contrastSum += Math.abs(brightness - avgBrightness);
  }
  const contrast = contrastSum / pixelCount;
  
  // Determine dominant color temperature
  let dominantColor: 'warm' | 'cool' | 'neutral' = 'neutral';
  if (avgR > avgB + 20) {
    dominantColor = 'warm';
  } else if (avgB > avgR + 20) {
    dominantColor = 'cool';
  }
  
  // Calculate colorfulness (color variance)
  const colorfulness = Math.sqrt(
    Math.pow(avgR - (avgR + avgG + avgB) / 3, 2) +
    Math.pow(avgG - (avgR + avgG + avgB) / 3, 2) +
    Math.pow(avgB - (avgR + avgG + avgB) / 3, 2)
  );
  
  // Enhanced face detection based on skin tone areas and facial patterns
  const skinTonePixels = countSkinTonePixels(data);
  const facePatterns = detectFacialPatterns(data, width, height);
  const skinToneRatio = skinTonePixels / pixelCount;
  
  // Calculate edge detection for facial structure analysis (like neural networks do)
  const edgeDetection = calculateEdgeDetection(data, width, height);
  
  // Calculate face confidence score (like Teachable Machine confidence)
  const faceConfidence = calculateFaceConfidence(skinToneRatio, facePatterns, edgeDetection);
  
  // Face detection for portraits and half-body shots only
  // Adjusted criteria for better portrait detection
  const faceDetected = (skinToneRatio > 0.08 && skinToneRatio < 0.8) && facePatterns && faceConfidence > 0.35;
  
  // Debug logging for troubleshooting
  console.log('Face Detection Debug:', {
    skinToneRatio: Math.round(skinToneRatio * 1000) / 1000,
    facePatterns,
    faceConfidence: Math.round(faceConfidence * 1000) / 1000,
    faceDetected,
    skinTonePixels,
    totalPixels: pixelCount,
    edgeDetection
  });
  
  // Determine image quality based on file size and resolution
  const resolution = width * height;
  let imageQuality: 'high' | 'medium' | 'low' = 'low';
  if (fileSize > 500000 && resolution > 90000) {
    imageQuality = 'high';
  } else if (fileSize > 100000 || resolution > 40000) {
    imageQuality = 'medium';
  }
  
  return {
    brightness: Math.round(avgBrightness),
    contrast: Math.round(contrast),
    colorfulness: Math.round(colorfulness),
    dominantColor,
    faceDetected,
    imageQuality,
    aspectRatio: width / height,
    faceConfidence: Math.round(faceConfidence * 100) / 100,
    edgeDetection: Math.round(edgeDetection)
  };
}

function countSkinTonePixels(data: Uint8ClampedArray): number {
  let skinPixels = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Enhanced skin tone detection inspired by Teachable Machine preprocessing
    // More robust detection across different ethnicities and lighting conditions
    const condition1 = r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15 && (r - b) > 15;
    const condition2 = r > 60 && r < 220 && g > 40 && g < 200 && b > 20 && b < 150 && 
                      Math.abs(r - g) < 40 && r > b;
    const condition3 = r > 80 && g > 50 && b > 30 && r > g && g > b && (r - b) > 20;
    // Additional condition for lighter skin tones
    const condition4 = r > 180 && g > 160 && b > 140 && r > g && g > b && (r - b) < 50;
    // Additional condition for darker skin tones  
    const condition5 = r > 40 && r < 120 && g > 25 && g < 90 && b > 15 && b < 70 && r > g && g > b;
    
    if (condition1 || condition2 || condition3 || condition4 || condition5) {
      skinPixels++;
    }
  }
  
  return skinPixels;
}

function detectFacialPatterns(data: Uint8ClampedArray, width: number, height: number): boolean {
  // Face detection for close-up portraits and half-body shots only
  // Exclude full-body shots for better accuracy
  
  const regions = [
    // Upper region (typical head position in half-body shots)
    { startY: 0, endY: 0.5, startX: 0.15, endX: 0.85 },
    // Full image (for close-up portraits)
    { startY: 0, endY: 1, startX: 0, endX: 1 }
  ];

  for (const region of regions) {
    if (detectFaceInRegion(data, width, height, region)) {
      return true; // If any region has face patterns, return true
    }
  }
  
  return false;
}

function detectFaceInRegion(data: Uint8ClampedArray, width: number, height: number, region: any): boolean {
  const startY = Math.floor(height * region.startY);
  const endY = Math.floor(height * region.endY);
  const startX = Math.floor(width * region.startX);
  const endX = Math.floor(width * region.endX);
  
  // 1. Check for facial symmetry (left-right balance) in this region
  let symmetryScore = 0;
  const samplePoints = 20;
  
  for (let i = 0; i < samplePoints; i++) {
    const y = startY + Math.floor(((i / samplePoints) * (endY - startY)));
    if (y >= height - 1) continue;
    
    const leftX = startX + Math.floor((endX - startX) * 0.25);
    const rightX = startX + Math.floor((endX - startX) * 0.75);
    
    if (leftX >= 0 && rightX < width) {
      const leftIndex = (y * width + leftX) * 4;
      const rightIndex = (y * width + rightX) * 4;
      
      const leftBrightness = (data[leftIndex] + data[leftIndex + 1] + data[leftIndex + 2]) / 3;
      const rightBrightness = (data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2]) / 3;
      
      if (Math.abs(leftBrightness - rightBrightness) < 50) {
        symmetryScore++;
      }
    }
  }
  
  // 2. Check for facial features in this region
  const regionHeight = endY - startY;
  const regionWidth = endX - startX;
  const upperFaceY = startY + Math.floor(regionHeight * 0.3);  // Eye region
  const midFaceY = startY + Math.floor(regionHeight * 0.5);    // Nose region  
  const lowerFaceY = startY + Math.floor(regionHeight * 0.7);  // Mouth region
  
  let featureScore = 0;
  
  // Check for contrast in eye region (darker spots for eyes)
  for (let x = startX + Math.floor(regionWidth * 0.25); x < startX + Math.floor(regionWidth * 0.75); x += 3) {
    if (upperFaceY < height && x < width) {
      const index = (upperFaceY * width + x) * 4;
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      if (brightness < 120) featureScore++; // Dark spots (potential eyes) - more lenient
    }
  }
  
  // 3. Check for vertical facial structure in this region
  let verticalStructure = 0;
  const centerX = startX + Math.floor(regionWidth / 2);
  
  for (let y = startY + Math.floor(regionHeight * 0.2); y < startY + Math.floor(regionHeight * 0.8); y += 2) {
    if (y < height && centerX < width) {
      const centerIndex = (y * width + centerX) * 4;
      const leftIndex = (y * width + Math.max(startX, centerX - 8)) * 4;
      const rightIndex = (y * width + Math.min(endX - 1, centerX + 8)) * 4;
      
      const centerBrightness = (data[centerIndex] + data[centerIndex + 1] + data[centerIndex + 2]) / 3;
      const leftBrightness = (data[leftIndex] + data[leftIndex + 1] + data[leftIndex + 2]) / 3;
      const rightBrightness = (data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2]) / 3;
      
      // Check if center region is relatively consistent (nose bridge/face center)
      if (Math.abs(centerBrightness - leftBrightness) < 30 && 
          Math.abs(centerBrightness - rightBrightness) < 30) {
        verticalStructure++;
      }
    }
  }
  
  // Balanced scoring for portraits and half-body shots
  const symmetryPassed = symmetryScore > samplePoints * 0.4;  // Moderate requirement
  const featuresPassed = featureScore > 3;  // Moderate requirement
  const structurePassed = verticalStructure > 8;  // Moderate requirement
  
  // Debug logging for facial pattern detection
  console.log('Facial Pattern Debug:', {
    region: `${region.startY}-${region.endY}, ${region.startX}-${region.endX}`,
    symmetryScore,
    featureScore, 
    verticalStructure,
    symmetryPassed,
    featuresPassed,
    structurePassed
  });
  
  // Require at least 2 out of 3 indicators for better accuracy
  const passedTests = [symmetryPassed, featuresPassed, structurePassed].filter(Boolean).length;
  
  return passedTests >= 2;  // Need 2 tests to pass for reliability
}

export function determinePersonalityFromFeatures(features: ImageFeatures, gender: string): string | null {
  const { brightness, contrast, colorfulness, dominantColor, faceDetected, imageQuality } = features;
  
  // CRITICAL: Only analyze portrait photos with detected faces
  if (!faceDetected) {
    return null; // Return null for non-portrait images
  }
  
  let scores = {
    tetoman: 0,
    egenman: 0,
    tetowoman: 0,
    egenwoman: 0
  };
  
  // 실제 연예인 스타일 기반 밝기 분석
  // 테토남(김종국,옥택연,안보현): 자연스럽고 활동적인 밝은 사진
  // 에겐남(차은우,최우식,정해인): 부드럽고 세련된 차분한 사진 
  // 테토녀(송혜교,이효리,수지): 밝고 당당한 에너지 넘치는 사진
  // 에겐녀(박보영,장원영,김태희): 자연스럽고 단아한 밝기의 사진
  if (brightness > 185) {
    // 매우 밝음 = 테토의 당당함과 직설적 성격 (송혜교,이효리 스타일)
    scores.tetoman += 35;
    scores.tetowoman += 40; // 테토녀가 더 밝은 사진 선호
  } else if (brightness > 160) {
    // 밝음 = 긍정적 에너지, 외향성 (김종국,옥택연 스타일)
    scores.tetoman += 30;
    scores.tetowoman += 35;
  } else if (brightness < 130) {
    // 어두움 = 에겐의 내성적이고 감성적인 면 (차은우,정해인 스타일)
    scores.egenman += 35;
    scores.egenwoman += 30;
  } else if (brightness < 155) {
    // 중간-낮음 = 사려깊고 섬세함 (박보영,장원영의 자연스러운 스타일)
    scores.egenman += 25;
    scores.egenwoman += 30; // 에겐녀가 더 자연스러운 밝기 선호
  } else {
    // 중간 밝기 = 균형감 있는 성격
    scores.tetoman += 15;
    scores.tetowoman += 15;
    scores.egenman += 20;
    scores.egenwoman += 20;
  }
  
  // 실제 연예인 사진 스타일 기반 대비 분석
  // 테토: 선명하고 강한 대비 (김종국의 강한 카리스마, 이효리의 대담한 스타일)
  // 에겐: 부드럽고 자연스러운 대비 (차은우의 세련된 분위기, 박보영의 내추럴함)
  if (contrast > 60) {
    // 높은 대비 = 테토의 결단력과 리더십 (송혜교 블랙&화이트, 김종국 강한 인상)
    scores.tetoman += 30;
    scores.tetowoman += 35;
  } else if (contrast > 40) {
    // 중-높은 대비 = 적당한 자신감
    scores.tetoman += 20;
    scores.tetowoman += 25;
    scores.egenman += 10;
    scores.egenwoman += 10;
  } else if (contrast < 30) {
    // 낮은 대비 = 에겐의 부드럽고 조화로운 성향 (정해인의 온화함, 장원영의 인형같은 부드러움)
    scores.egenman += 30;
    scores.egenwoman += 35;
  } else {
    // 중-낮은 대비 = 섬세하고 배려하는 성향 (차은우의 세련됨, 박보영의 자연스러움)
    scores.egenman += 25;
    scores.egenwoman += 30;
  }
  
  // 실제 연예인 컬러 선호도 기반 분석
  // 테토: 따뜻하고 강렬한 컬러 (이효리 Y2K 스타일, 수지 활기찬 룩)
  // 에겐: 차가운 톤이나 베이직 컬러 (차은우 올블랙, 박보영 베이직 톤)
  if (dominantColor === 'warm') {
    // 따뜻한 톤 = 테토의 열정적이고 직설적인 성향 (송혜교 따뜻한 무드, 김종국 활동적 에너지)
    scores.tetoman += 25;
    scores.tetowoman += 30; // 테토녀가 따뜻한 컬러를 더 활용
    // 에겐도 따뜻함으로 감성 표현 (정해인의 자연스러운 무드)
    scores.egenman += 10;
    scores.egenwoman += 10;
  } else if (dominantColor === 'cool') {
    // 차가운 톤 = 에겐의 차분하고 사려깊은 성향 (차은우 시크함, 장원영 청순함)
    scores.egenman += 30;
    scores.egenwoman += 25; // 에겐남이 쿨톤을 더 선호
  } else {
    // 중성 톤 = 균형감, 테토의 자유로운 성향에 더 가까움
    scores.tetoman += 18;
    scores.tetowoman += 18;
    scores.egenman += 12;
    scores.egenwoman += 15; // 에겐녀는 베이직 톤 선호 (박보영 스타일)
  }
  
  // 실제 연예인 컬러풀함 기반 분석
  // 테토: 화려하고 생동감 있는 컬러 (이효리 다채로운 스타일, 수지 생기발랄함)
  // 에겐: 절제되고 세련된 컬러 (차은우 미니멀, 박보영 자연스러운 톤)
  if (colorfulness > 30) {
    // 높은 컬러풀함 = 테토의 활기차고 표현력 강한 성향 (이효리 화려함, 옥택연 다양한 매력)
    scores.tetoman += 25;
    scores.tetowoman += 35; // 테토녀가 더 다채로운 표현 선호 (수지 핑크-레드 활용)
  } else if (colorfulness > 18) {
    // 중간 컬러풀함 = 적당한 표현력
    scores.tetoman += 18;
    scores.tetowoman += 22;
    scores.egenman += 12;
    scores.egenwoman += 15; // 장원영의 적당한 컬러 활용
  } else if (colorfulness < 12) {
    // 낮은 컬러풀함 = 에겐의 절제되고 내성적인 접근 (차은우 모노톤, 김태희 단아함)
    scores.egenman += 30;
    scores.egenwoman += 35; // 박보영의 베이직 컬러 선호
  } else {
    // 중-낮은 컬러풀함 = 에겐의 부드럽고 섬세한 표현 (정해인 자연스러움)
    scores.egenman += 25;
    scores.egenwoman += 30;
  }
  
  // Face confidence as indicator of self-presentation style
  const { faceConfidence, edgeDetection } = features;
  if (faceConfidence > 0.7) {
    // High confidence = clear, direct self-presentation (테토 성향)
    scores.tetoman += 20;
    scores.tetowoman += 20;
  } else if (faceConfidence > 0.5) {
    // Good confidence = moderate directness
    scores.tetoman += 10;
    scores.tetowoman += 10;
    scores.egenman += 5;
    scores.egenwoman += 5;
  } else if (faceConfidence < 0.4) {
    // Lower confidence = artistic, subtle approach (에겐 성향)
    scores.egenman += 20;
    scores.egenwoman += 20;
  }
  
  // Edge detection for photo style preference
  if (edgeDetection > 12000) {
    // Sharp edges = crisp, direct style (테토 성향)
    scores.tetoman += 15;
    scores.tetowoman += 15;
  } else if (edgeDetection < 6000) {
    // Soft edges = gentle, flowing style (에겐 성향)
    scores.egenman += 15;
    scores.egenwoman += 15;
  }
  
  // Image quality suggests attention to aesthetic details
  if (imageQuality === 'high') {
    // High quality = careful curation (에겐의 섬세함)
    scores.egenman += 15;
    scores.egenwoman += 15;
    // But also confident self-presentation (테토의 당당함)
    scores.tetoman += 10;
    scores.tetowoman += 10;
  } else if (imageQuality === 'low') {
    // Lower quality = spontaneous, less fussy (테토의 자유로움)
    scores.tetoman += 10;
    scores.tetowoman += 5;
  }
  
  // Gender filtering
  const availableTypes = gender === 'male' 
    ? ['tetoman', 'egenman']
    : gender === 'female'
    ? ['tetowoman', 'egenwoman'] 
    : ['tetoman', 'egenman', 'tetowoman', 'egenwoman'];
  
  // Find highest scoring available type
  let bestType = availableTypes[0];
  let bestScore = scores[bestType as keyof typeof scores];
  
  for (const type of availableTypes) {
    const score = scores[type as keyof typeof scores];
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  
  // Add randomness (20% chance for variety)
  if (Math.random() < 0.2) {
    bestType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }
  
  return bestType;
}

// Edge detection algorithm for facial structure analysis (inspired by neural network preprocessing)
function calculateEdgeDetection(data: Uint8ClampedArray, width: number, height: number): number {
  let edgeScore = 0;
  const sobelThreshold = 50;
  
  // Sobel edge detection (simplified version)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get surrounding pixel brightnesses
      const tl = (data[((y-1) * width + (x-1)) * 4] + data[((y-1) * width + (x-1)) * 4 + 1] + data[((y-1) * width + (x-1)) * 4 + 2]) / 3;
      const tm = (data[((y-1) * width + x) * 4] + data[((y-1) * width + x) * 4 + 1] + data[((y-1) * width + x) * 4 + 2]) / 3;
      const tr = (data[((y-1) * width + (x+1)) * 4] + data[((y-1) * width + (x+1)) * 4 + 1] + data[((y-1) * width + (x+1)) * 4 + 2]) / 3;
      const ml = (data[(y * width + (x-1)) * 4] + data[(y * width + (x-1)) * 4 + 1] + data[(y * width + (x-1)) * 4 + 2]) / 3;
      const mr = (data[(y * width + (x+1)) * 4] + data[(y * width + (x+1)) * 4 + 1] + data[(y * width + (x+1)) * 4 + 2]) / 3;
      const bl = (data[((y+1) * width + (x-1)) * 4] + data[((y+1) * width + (x-1)) * 4 + 1] + data[((y+1) * width + (x-1)) * 4 + 2]) / 3;
      const bm = (data[((y+1) * width + x) * 4] + data[((y+1) * width + x) * 4 + 1] + data[((y+1) * width + x) * 4 + 2]) / 3;
      const br = (data[((y+1) * width + (x+1)) * 4] + data[((y+1) * width + (x+1)) * 4 + 1] + data[((y+1) * width + (x+1)) * 4 + 2]) / 3;
      
      // Sobel operators
      const gx = (tr + 2*mr + br) - (tl + 2*ml + bl);
      const gy = (bl + 2*bm + br) - (tl + 2*tm + tr);
      
      // Edge magnitude
      const magnitude = Math.sqrt(gx*gx + gy*gy);
      
      if (magnitude > sobelThreshold) {
        edgeScore++;
      }
    }
  }
  
  return edgeScore;
}

// Calculate face confidence score for portraits and half-body shots
function calculateFaceConfidence(skinToneRatio: number, facialPatterns: boolean, edgeDetection: number): number {
  let confidence = 0;
  
  // Skin tone contribution (0-0.4) - balanced range for portraits/half-body
  if (skinToneRatio >= 0.08 && skinToneRatio <= 0.8) {
    const idealRatio = 0.18; // Ideal ratio for portraits and half-body shots
    const distance = Math.abs(skinToneRatio - idealRatio);
    confidence += Math.max(0, 0.4 - (distance * 1.5)); // Moderate penalty for distance
  }
  
  // Facial patterns contribution (0-0.4) - standard weight
  if (facialPatterns) {
    confidence += 0.4;
  }
  
  // Edge detection contribution (0-0.2) - standard threshold
  const normalizedEdges = Math.min(edgeDetection / 800, 1);
  confidence += normalizedEdges * 0.2;
  
  return Math.min(confidence, 1.0); // Cap at 1.0
}