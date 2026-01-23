// ===================================
// 전역 변수
// ===================================

// PDF.js 워커 설정 (PDF 파싱을 위한 필수 설정)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 전역 상태 관리 객체
let appState = {
    pdfText: '',           // PDF에서 추출한 전체 텍스트
    menuData: {},          // 날짜별 메뉴 데이터 (예: { '2025-01-20': ['밥', '국', '김치'] })
    currentDate: '',       // 현재 선택된 날짜
    currentMenu: []        // 현재 선택된 날짜의 메뉴
};

// ===================================
// DOM 요소 참조
// ===================================
const pdfUpload = document.getElementById('pdfUpload');
const uploadStatus = document.getElementById('uploadStatus');
const dateSection = document.getElementById('dateSection');
const dateInput = document.getElementById('dateInput');
const searchBtn = document.getElementById('searchBtn');
const menuSection = document.getElementById('menuSection');
const selectedDate = document.getElementById('selectedDate');
const menuList = document.getElementById('menuList');
const imageSection = document.getElementById('imageSection');
const placeholderInfo = document.getElementById('placeholderInfo');

// ===================================
// 이벤트 리스너 등록
// ===================================

// PDF 파일 업로드 이벤트
pdfUpload.addEventListener('change', handlePDFUpload);

// 급식 메뉴 검색 버튼 클릭 이벤트
searchBtn.addEventListener('click', handleMenuSearch);

// ===================================
// 1단계: PDF 업로드 처리
// ===================================

/**
 * PDF 파일 업로드 처리 함수
 * @param {Event} event - 파일 input change 이벤트
 */
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    
    // 파일이 선택되지 않은 경우
    if (!file) {
        uploadStatus.textContent = '파일이 선택되지 않았습니다';
        uploadStatus.classList.remove('success');
        return;
    }
    
    // PDF 파일이 아닌 경우
    if (file.type !== 'application/pdf') {
        uploadStatus.textContent = 'PDF 파일만 업로드할 수 있습니다';
        uploadStatus.classList.remove('success');
        alert('❌ PDF 파일만 업로드해주세요!');
        return;
    }
    
    // 업로드 진행 중 표시
    uploadStatus.textContent = '📤 PDF 파일을 읽는 중...';
    uploadStatus.classList.remove('success');
    
    try {
        // PDF 파일 읽기
        const pdfText = await readPDFFile(file);
        appState.pdfText = pdfText;
        
        // PDF에서 메뉴 데이터 추출
        appState.menuData = extractMenuData(pdfText);
        
        // 성공 메시지 표시
        uploadStatus.textContent = `✅ ${file.name} 업로드 완료! (${Object.keys(appState.menuData).length}개 날짜 인식됨)`;
        uploadStatus.classList.add('success');
        
        // 2단계 날짜 선택 섹션 표시
        dateSection.classList.add('active');
        
        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        
        console.log('✅ PDF 파싱 완료:', appState.menuData);
        
    } catch (error) {
        console.error('❌ PDF 읽기 오류:', error);
        uploadStatus.textContent = '❌ PDF 파일을 읽는 중 오류가 발생했습니다';
        uploadStatus.classList.remove('success');
        alert('PDF 파일을 읽는 중 오류가 발생했습니다. 다른 파일을 시도해주세요.');
    }
}

/**
 * PDF 파일을 읽어서 텍스트로 변환
 * @param {File} file - PDF 파일 객체
 * @returns {Promise<string>} - 추출된 텍스트
 */
async function readPDFFile(file) {
    // FileReader로 PDF 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    
    // PDF.js로 PDF 문서 로드
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // 모든 페이지를 순회하며 텍스트 추출
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 텍스트 아이템들을 하나의 문자열로 결합
        const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
        
        fullText += pageText + '\n';
    }
    
    return fullText;
}

/**
 * PDF 텍스트에서 날짜별 메뉴 데이터 추출
 * @param {string} text - PDF에서 추출한 전체 텍스트
 * @returns {Object} - 날짜별 메뉴 객체 { '2025-01-20': ['밥', '국', ...] }
 */
function extractMenuData(text) {
    const menuData = {};
    
    // 줄 단위로 분리
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // 날짜 패턴 (다양한 형식 지원)
    // 예: "1월 20일", "01/20", "2025-01-20", "1.20", "20일" 등
    const datePatterns = [
        /(\d{1,2})월\s*(\d{1,2})일/,           // "1월 20일"
        /(\d{4})-(\d{1,2})-(\d{1,2})/,        // "2025-01-20"
        /(\d{1,2})\/(\d{1,2})/,                // "01/20"
        /(\d{1,2})\.(\d{1,2})/,                // "1.20"
        /(\d{1,2})일\s*\(.*?\)/                // "20일(월)" 형식
    ];
    
    let currentDate = null;
    let currentMenuItems = [];
    
    // 각 줄을 분석
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 날짜 패턴 매칭 시도
        let dateFound = false;
        
        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match) {
                // 이전 날짜의 메뉴 저장
                if (currentDate && currentMenuItems.length > 0) {
                    menuData[currentDate] = [...currentMenuItems];
                }
                
                // 새로운 날짜 파싱
                currentDate = parseDateFromMatch(match, pattern);
                currentMenuItems = [];
                dateFound = true;
                break;
            }
        }
        
        // 날짜가 아니면 메뉴 항목으로 간주
        if (!dateFound && currentDate) {
            // 메뉴로 보이는 항목만 추가 (특수문자나 숫자만 있는 줄 제외)
            if (isMenuLine(line)) {
                currentMenuItems.push(line);
            }
        }
    }
    
    // 마지막 날짜의 메뉴 저장
    if (currentDate && currentMenuItems.length > 0) {
        menuData[currentDate] = [...currentMenuItems];
    }
    
    return menuData;
}

/**
 * 날짜 매칭 결과를 YYYY-MM-DD 형식으로 변환
 * @param {Array} match - 정규식 매칭 결과
 * @param {RegExp} pattern - 사용된 정규식 패턴
 * @returns {string} - YYYY-MM-DD 형식의 날짜
 */
function parseDateFromMatch(match, pattern) {
    const currentYear = new Date().getFullYear();
    
    // 패턴별로 다르게 파싱
    const patternString = pattern.toString();
    
    if (patternString.includes('월')) {
        // "1월 20일" 형식
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (patternString.includes('\\d{4}')) {
        // "2025-01-20" 형식
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (patternString.includes('\\/')) {
        // "01/20" 형식
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (patternString.includes('\\.')) {
        // "1.20" 형식
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
        // "20일(월)" 형식 - 추가 파싱 필요
        const day = parseInt(match[1]);
        // 현재 월 사용 (간단한 구현)
        const month = new Date().getMonth() + 1;
        return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
}

/**
 * 해당 줄이 메뉴 항목인지 판단
 * @param {string} line - 검사할 텍스트 줄
 * @returns {boolean} - 메뉴 항목 여부
 */
function isMenuLine(line) {
    // 너무 짧은 텍스트 제외
    if (line.length < 2) return false;
    
    // 숫자나 특수문자만 있는 경우 제외
    if (/^[\d\s\.\,\-\(\)\/]+$/.test(line)) return false;
    
    // 일반적인 메뉴 관련 키워드 포함 확인
    const menuKeywords = ['밥', '국', '찌개', '김치', '반찬', '조림', '구이', '볶음', '튀김', '샐러드', '과일', '우유', '음료'];
    const hasMenuKeyword = menuKeywords.some(keyword => line.includes(keyword));
    
    // 한글이 포함되어 있으면 메뉴로 간주
    const hasKorean = /[가-힣]/.test(line);
    
    return hasKorean && (hasMenuKeyword || line.length >= 3);
}

// ===================================
// 2단계: 급식 메뉴 검색
// ===================================

/**
 * 선택한 날짜의 급식 메뉴 검색 및 표시
 */
function handleMenuSearch() {
    const selectedDateValue = dateInput.value;
    
    // 날짜가 선택되지 않은 경우
    if (!selectedDateValue) {
        alert('❌ 날짜를 선택해주세요!');
        return;
    }
    
    // PDF가 업로드되지 않은 경우
    if (Object.keys(appState.menuData).length === 0) {
        alert('❌ 먼저 PDF 파일을 업로드해주세요!');
        return;
    }
    
    // 선택한 날짜의 메뉴 찾기
    const menu = appState.menuData[selectedDateValue];
    
    // 상태 업데이트
    appState.currentDate = selectedDateValue;
    appState.currentMenu = menu || [];
    
    // 메뉴 표시
    displayMenu(selectedDateValue, menu);
    
    // 3단계 메뉴 섹션 표시
    menuSection.classList.add('active');
    
    // 4단계 이미지 섹션 표시
    imageSection.classList.add('active');
    
    // 이미지 placeholder 업데이트
    updateImagePlaceholder(menu);
}

/**
 * 급식 메뉴를 화면에 표시
 * @param {string} date - 선택된 날짜 (YYYY-MM-DD)
 * @param {Array|undefined} menu - 메뉴 배열
 */
function displayMenu(date, menu) {
    // 날짜를 한글 형식으로 변환 (예: "2025년 1월 20일 (월)")
    const dateObj = new Date(date + 'T00:00:00');
    const koreanDate = formatKoreanDate(dateObj);
    
    selectedDate.textContent = koreanDate;
    
    // 메뉴가 없는 경우
    if (!menu || menu.length === 0) {
        menuList.innerHTML = `
            <div class="no-menu-found">
                📭 해당 날짜의 급식 정보가 없습니다
            </div>
        `;
        return;
    }
    
    // 메뉴 목록 HTML 생성
    const menuHTML = menu.map(item => `
        <div class="menu-item">${item}</div>
    `).join('');
    
    menuList.innerHTML = menuHTML;
}

/**
 * 날짜를 한글 형식으로 변환
 * @param {Date} date - Date 객체
 * @returns {string} - 한글 형식 날짜 (예: "2025년 1월 20일 (월)")
 */
function formatKoreanDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

// ===================================
// 4단계: 이미지 placeholder 업데이트
// ===================================

/**
 * 이미지 생성 영역 업데이트 (추후 AI 연동 준비)
 * @param {Array|undefined} menu - 메뉴 배열
 */
function updateImagePlaceholder(menu) {
    if (!menu || menu.length === 0) {
        placeholderInfo.innerHTML = `
            <p><strong>이미지 생성 준비:</strong> 메뉴 정보 없음</p>
        `;
        return;
    }
    
    // 메뉴를 문장으로 결합 (이미지 생성 프롬프트용)
    const menuText = menu.join(', ');
    
    // AI 이미지 생성을 위한 프롬프트 미리보기
    const prompt = `한국 학교 급식 식판에 담긴 음식: ${menuText}. 
    사실적이고 맛있어 보이는 학교 급식 이미지.`;
    
    placeholderInfo.innerHTML = `
        <p><strong>🤖 AI 이미지 생성 준비됨</strong></p>
        <p><strong>메뉴:</strong> ${menuText}</p>
        <p><strong>프롬프트:</strong> "${prompt}"</p>
        <p style="margin-top: 12px; font-size: 0.85rem; opacity: 0.8;">
            ※ 이 영역에 Gemini API를 연동하면 실제 이미지가 생성됩니다
        </p>
    `;
}

// ===================================
// [확장 지점] AI 이미지 생성 함수 (추후 구현)
// ===================================

/**
 * [확장 지점] Gemini AI를 사용한 이미지 생성
 * 이 함수는 현재 구현되지 않았으며, 추후 Gemini API 연동 시 사용
 * 
 * @param {Array} menu - 메뉴 배열
 * @returns {Promise<string>} - 생성된 이미지 URL
 * 
 * 사용 예시:
 * const imageUrl = await generateImageWithGemini(appState.currentMenu);
 * document.getElementById('generatedImage').src = imageUrl;
 */
async function generateImageWithGemini(menu) {
    // TODO: Gemini API 연동
    // 1. 메뉴를 기반으로 프롬프트 생성
    const menuText = menu.join(', ');
    const prompt = `한국 학교 급식 식판에 담긴 음식: ${menuText}. 사실적이고 맛있어 보이는 학교 급식 이미지.`;
    
    // 2. Gemini API 호출 (예시 코드)
    /*
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            prompt: prompt,
            // 기타 설정...
        })
    });
    
    const data = await response.json();
    return data.imageUrl;
    */
    
    // 현재는 placeholder 반환
    return 'placeholder-image.jpg';
}

// ===================================
// 초기화 코드
// ===================================

console.log('✅ 급식 식단표 웹앱 초기화 완료');
console.log('📌 PDF 파일을 업로드하면 자동으로 메뉴를 파싱합니다');
