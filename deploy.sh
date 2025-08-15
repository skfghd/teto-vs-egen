#!/bin/bash

# Firebase 배포 스크립트 - 테토vs에겐 성향 분석 앱
# Firebase로 원클릭 배포를 위한 자동화 스크립트

set -e

echo "🔥 Firebase 배포 시작 - 테토vs에겐 성향 분석 앱"
echo "=================================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI가 설치되지 않았습니다.${NC}"
    echo "다음 명령으로 설치해주세요: npm install -g firebase-tools"
    exit 1
fi

# 프로젝트 ID 확인
if [ ! -f ".firebaserc" ]; then
    echo -e "${RED}❌ .firebaserc 파일이 없습니다.${NC}"
    echo "Firebase 프로젝트를 먼저 설정해주세요: firebase init"
    exit 1
fi

PROJECT_ID=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${YELLOW}⚠️  프로젝트 ID를 설정해주세요${NC}"
    read -p "Firebase 프로젝트 ID를 입력하세요: " NEW_PROJECT_ID
    sed -i "s/your-project-id/$NEW_PROJECT_ID/g" .firebaserc
    sed -i "s/your-project-id/$NEW_PROJECT_ID/g" vite.firebase.config.ts
    sed -i "s/your-project-id/$NEW_PROJECT_ID/g" functions/.env.example
    PROJECT_ID=$NEW_PROJECT_ID
fi

echo -e "${BLUE}📱 프로젝트: $PROJECT_ID${NC}"

# Firebase 로그인 확인
echo -e "${YELLOW}🔐 Firebase 로그인 확인 중...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Firebase 로그인이 필요합니다${NC}"
    firebase login
fi

# Node.js 버전 확인
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}❌ Node.js 18 이상이 필요합니다. 현재 버전: $(node -v)${NC}"
    exit 1
fi

# 의존성 설치
echo -e "${YELLOW}📦 클라이언트 의존성 설치 중...${NC}"
npm install

echo -e "${YELLOW}📦 Functions 의존성 설치 중...${NC}"
cd functions
npm install
cd ..

# 환경변수 설정 확인
if [ ! -f "functions/.env" ]; then
    echo -e "${YELLOW}⚠️  functions/.env 파일이 없습니다${NC}"
    echo "functions/.env.example을 참고하여 환경변수를 설정해주세요"
    cp functions/.env.example functions/.env
    echo -e "${BLUE}📝 functions/.env 파일을 생성했습니다. 필요한 값들을 설정 후 다시 실행해주세요${NC}"
    exit 1
fi

# 클라이언트 빌드
echo -e "${YELLOW}🏗️  클라이언트 빌드 중...${NC}"
npm run build || {
    echo -e "${RED}❌ 클라이언트 빌드 실패${NC}"
    exit 1
}

# Functions 빌드
echo -e "${YELLOW}🏗️  Functions 빌드 중...${NC}"
cd functions
npm run build || {
    echo -e "${RED}❌ Functions 빌드 실패${NC}"
    exit 1
}
cd ..

# Firebase 배포
echo -e "${YELLOW}🚀 Firebase 배포 시작...${NC}"
firebase deploy || {
    echo -e "${RED}❌ Firebase 배포 실패${NC}"
    exit 1
}

# 배포 완료
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo "=================================================="
echo -e "${BLUE}🎉 테토vs에겐 성향 분석 앱이 성공적으로 배포되었습니다!${NC}"
echo ""
echo -e "${GREEN}🌐 웹사이트 URL:${NC}"
echo "   https://$PROJECT_ID.web.app"
echo "   https://$PROJECT_ID.firebaseapp.com"
echo ""
echo -e "${GREEN}⚡ Functions URL:${NC}"
echo "   https://asia-northeast3-$PROJECT_ID.cloudfunctions.net/api"
echo ""
echo -e "${BLUE}📊 Firebase Console:${NC}"
echo "   https://console.firebase.google.com/project/$PROJECT_ID"
echo ""
echo -e "${YELLOW}💡 다음 단계:${NC}"
echo "   1. Google AdSense 계정 설정"
echo "   2. 도메인 연결 (선택사항)"
echo "   3. Analytics 설정"
echo ""
echo -e "${GREEN}🎭 테토vs에겐으로 재미있는 성향 분석을 시작하세요!${NC}"