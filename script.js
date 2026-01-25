// ===================================
// 전역 변수
// ===================================

// PDF.js 워커 설정 (PDF 파싱을 위한 필수 설정)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

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

// 이미지 생성 관련 요소 (새로 추가)
const generateImageBtn = document.getElementById('generateImageBtn');
const loadingState = document.getElementById('loadingState');
const imageResult = document.getElementById('imageResult');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const generatedImage = document.getElementById('generatedImage');
const imageInfo = document.getElementById('imageInfo');

// ===================================
// 이벤트 리스너 등록
// ===================================

// PDF 파일 업로드 이벤트
pdfUpload.addEventListener('change', handlePDFUpload);

// 급식 메뉴 검색 버튼 클릭 이벤트
searchBtn.addEventListener('click', handleMenuSearch);

// 이미지 생성 버튼 클릭 이벤트 (새로 추가)
generateImageBtn.addEventListener('click', handleImageGeneration);

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
    
    // 전체 텍스트를 공백으로 분리한 토큰 배열도 준비
    const tokens = text.split(/\s+/).filter(token => token.length > 0);
    
    console.log('📄 PDF 파싱 시작 - 총 줄 수:', lines.length);
    console.log('📄 전체 텍스트 토큰:', tokens.slice(0, 50)); // 처음 50개만 로그
    
    // 방법 1: 줄 기반 파싱 (기존 방식)
    const lineBasedData = parseLineByLine(lines);
    
    // 방법 2: 테이블 형식 파싱 (새로 추가 - 업로드한 PDF용)
    const tableBasedData = parseTableFormat(text, tokens);
    
    // 두 방식의 결과를 합침 (테이블 방식 우선)
    Object.assign(menuData, lineBasedData, tableBasedData);
    
    console.log('✅ 파싱 완료 - 인식된 날짜 수:', Object.keys(menuData).length);
    console.log('📋 인식된 데이터:', menuData);
    
    return menuData;
}

/**
 * 줄 단위 파싱 (기존 방식)
 */
function parseLineByLine(lines) {
    const menuData = {};
    
    const datePatterns = [
        /(\d{1,2})월\s*(\d{1,2})일/,           // "1월 20일"
        /(\d{4})-(\d{1,2})-(\d{1,2})/,        // "2025-01-20"
        /(\d{1,2})\/(\d{1,2})/,                // "01/20"
        /(\d{1,2})\.(\d{1,2})/,                // "1.20"
        /(\d{1,2})일\s*\(.*?\)/                // "20일(월)" 형식
    ];
    
    let currentDate = null;
    let currentMenuItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let dateFound = false;
        
        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match) {
                if (currentDate && currentMenuItems.length > 0) {
                    menuData[currentDate] = [...currentMenuItems];
                }
                currentDate = parseDateFromMatch(match, pattern);
                currentMenuItems = [];
                dateFound = true;
                break;
            }
        }
        
        if (!dateFound && currentDate) {
            if (isMenuLine(line)) {
                currentMenuItems.push(line);
            }
        }
    }
    
    if (currentDate && currentMenuItems.length > 0) {
        menuData[currentDate] = [...currentMenuItems];
    }
    
    return menuData;
}

/**
 * 테이블 형식 파싱 (가로 배치 테이블용)
 * PDF.js가 테이블을 제대로 못 읽는 경우를 대비한 강건한 파싱
 */
function parseTableFormat(text, tokens) {
    const menuData = {};
    
    console.log('🔍 테이블 형식 파싱 시작');
    
    // 1. 날짜 패턴 찾기
    const datePattern = /(\d{1,2})월\s*(\d{1,2})일\s*\(([^\)]+)\)/g;
    const dates = [];
    let match;
    
    while ((match = datePattern.exec(text)) !== null) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const weekday = match[3];
        
        // 유효한 요일인지 확인
        if (weekday.length > 1) continue;
        
        let year = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        if (month === 12 && currentMonth === 1) year = year - 1;
        else if (month === 1 && currentMonth === 12) year = year + 1;
        
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({
            dateStr: dateStr,
            month: month,
            day: day,
            weekday: weekday,
            originalText: match[0]
        });
    }
    
    console.log('📅 인식된 날짜:', dates.map(d => d.dateStr));
    
    if (dates.length === 0) {
        console.log('❌ 날짜를 찾을 수 없습니다');
        return menuData;
    }
    
    // 2. 전체 텍스트에서 실제 메뉴만 추출
    const allMenuItems = [];
    for (const line of lines) {
        const originalLine = line;
        // 1️⃣ 날짜 / 요일 완전 제외
        if (
            /\d{1,2}월/.test(line) ||
            /\d{1,2}일/.test(line) ||
            /\(월\)|\(화\)|\(수\)|\(목\)|\(금\)/.test(line)
        ) {
            continue;
        }
        // 2️⃣ 영양 / 원산지 / 설명 텍스트 제외
        if (
            /원산지|학교급식|영양소|영양량|에너지|kcal|RAE|칼슘|철분|단백질|지방|탄수화물|비타민|평균|권장|섭취량/.test(line)
        ) {
            continue;
        }
        // 3️⃣ 줄 전체가 알레르기 정보인 경우 제외
        if (/^\([0-9\.\s]+\)$/.test(line)) {
            continue;
        }
        // 4️⃣ 알레르기 괄호만 제거 (메뉴는 살림)
        let cleaned = line.replace(/\([0-9\.\s]+\)/g, '').trim();
        // 5️⃣ 화살표 메뉴 처리 (→ 백김치 등)
        cleaned = cleaned.replace(/\s*->\s*/g, ' / ').trim();
        // 6️⃣ 공백 정리
        cleaned = cleaned.replace(/\s+/g, ' ');
        // 7️⃣ 한글 2글자 이상 + 숫자 위주 텍스트 제외
        if (
            /[가-힣]{2,}/.test(cleaned) &&
            !/^[\d\s\.\,\-\/]+$/.test(cleaned)
        ) {
            allMenuItems.push(cleaned);
            console.log(`  ✅ 메뉴 인식: "${cleaned}" (원본: "${originalLine}")`);
        }
    }
    
    console.log(`📋 전체 메뉴 항목 ${allMenuItems.length}개 추출:`, allMenuItems.slice(0, 20));
    
    // 3. 메뉴를 5개 날짜에 균등 배분
    // 가정: 각 날짜마다 대략 비슷한 수의 메뉴 (보통 5-8개)
    const menusPerDate = Math.floor(allMenuItems.length / dates.length);
    
    console.log(`📊 날짜당 예상 메뉴 수: ${menusPerDate}개`);
    
    dates.forEach((date, idx) => {
        const start = idx * menusPerDate;
        const end = idx === dates.length - 1 
            ? allMenuItems.length  // 마지막 날짜는 남은 메뉴 전부
            : (idx + 1) * menusPerDate;
        
        const menus = allMenuItems.slice(start, end);
        
        if (menus.length > 0) {
            menuData[date.dateStr] = menus;
            console.log(`✅ ${date.dateStr}: ${menus.length}개 메뉴`, menus);
        }
    });
    
    return menuData;
}

/**
 * 유효한 메뉴 항목인지 검사
 */
function isValidMenuItem(text) {
    // 공백 제거한 실제 텍스트
    const trimmed = text.trim();
    
    // 너무 짧은 텍스트
    if (trimmed.length < 2) return false;
    
    // 한글이 없으면 메뉴가 아님
    if (!/[가-힣]/.test(trimmed)) return false;
    
    // 숫자와 기호만 있는 경우
    if (/^[\d\s\.\,\-\(\)\/\:]+$/.test(trimmed)) return false;
    
    // 제외할 키워드들 (정확히 일치하거나 포함된 경우만)
    const excludeKeywords = [
        '원산지', '영양소', '에너지', '칼슘', '국내산', '수입',
        '평균', '권장', '섭취량', '탄수화물', '단백질', '지방',
        '비타민', '철분', '리보플라빈', '티아민',
        '학교급식', '주간', '알레르기', 'kcal', 'RAE', 'mg'
    ];
    
    // 제외 키워드 체크
    for (const keyword of excludeKeywords) {
        if (trimmed.includes(keyword)) {
            return false;
        }
    }
    
    // 날짜 패턴이 있으면 제외
    if (/\d{1,2}월\s*\d{1,2}일/.test(trimmed)) {
        return false;
    }
    
    // 여기까지 통과하면 메뉴로 간주
    return true;
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
// [확장 지점] AI 이미지 생성 함수
// ===================================

/**
 * 이미지 생성 버튼 클릭 핸들러
 * 사용자가 "급식 이미지 생성하기" 버튼을 클릭하면 실행됨
 */
async function handleImageGeneration() {
    // 메뉴가 선택되지 않은 경우
    if (!appState.currentMenu || appState.currentMenu.length === 0) {
        alert('❌ 먼저 날짜를 선택하고 급식 메뉴를 불러와주세요!');
        return;
    }
    
    try {
        // 1. UI 상태 변경: 로딩 시작
        showLoadingState();
        
        // 2. 서버에 이미지 생성 요청
        const imageUrl = await requestImageGeneration(
            appState.currentDate,
            appState.currentMenu
        );
        
        // 3. 생성된 이미지 표시
        displayGeneratedImage(imageUrl, appState.currentMenu);
        
    } catch (error) {
        console.error('❌ 이미지 생성 오류:', error);
        hideLoadingState();
        alert('이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

/**
 * 로딩 상태 표시
 */
function showLoadingState() {
    generateImageBtn.disabled = true;
    imagePlaceholder.style.display = 'none';
    imageResult.style.display = 'none';
    loadingState.style.display = 'block';
}

/**
 * 로딩 상태 숨김
 */
function hideLoadingState() {
    generateImageBtn.disabled = false;
    loadingState.style.display = 'none';
}

/**
 * 서버에 이미지 생성 API 요청
 * @param {string} date - 선택된 날짜 (YYYY-MM-DD)
 * @param {Array} menu - 메뉴 배열
 * @returns {Promise<string>} - 생성된 이미지 URL
 */
async function requestImageGeneration(date, menu) {
    // 메뉴를 하나의 문자열로 결합
    const menuText = menu.join(', ');
    
    // 이미지 생성용 프롬프트 생성
    const prompt = createImagePrompt(menuText);
    
    console.log('📤 이미지 생성 요청:', { date, menu, menuText, prompt });
    
    // ⚠️ 개발 모드: 서버 없이 mock 이미지 사용
    // 실제 서버 배포 후에는 아래 주석을 해제하세요
    /*
    const apiEndpoint = '/api/generate-image';
    
    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            date: date,
            menu: menu,
            menuText: menuText,
            prompt: prompt
        })
    });
    
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return data.imageUrl;
    */
    
    // 🔧 임시: Mock 이미지 생성 (서버 없이 테스트용)
    return await mockImageGeneration(date, menu);
}

/**
 * Gemini AI 이미지 생성용 프롬프트 생성
 * @param {string} menuText - 메뉴 문자열 (예: "밥, 김치찌개, 깍두기")
 * @returns {string} - 이미지 생성 프롬프트
 */
function createImagePrompt(menuText) {
    // 초등학교 급식 특화 프롬프트
    const prompt = `
A realistic photo of Korean elementary school lunch on a plastic cafeteria tray.
The tray contains: ${menuText}.
The food is served in a typical school cafeteria setting with natural lighting.
The colors are realistic and not overly saturated.
The image should look appetizing but not exaggerated.
Focus on the actual meal presentation in a school environment.
High quality, detailed food photography.
    `.trim();
    
    return prompt;
}

/**
 * 생성된 이미지를 화면에 표시
 * @param {string} imageUrl - 이미지 URL 또는 base64 데이터
 * @param {Array} menu - 메뉴 배열
 */
function displayGeneratedImage(imageUrl, menu) {
    // 로딩 상태 숨김
    hideLoadingState();
    
    // placeholder 숨김
    imagePlaceholder.style.display = 'none';
    
    // 이미지 설정
    generatedImage.src = imageUrl;
    generatedImage.alt = `급식 이미지: ${menu.join(', ')}`;
    
    // 이미지 정보 표시
    const menuText = menu.join(', ');
    imageInfo.innerHTML = `
        <p><strong>📅 날짜:</strong> ${formatKoreanDate(new Date(appState.currentDate + 'T00:00:00'))}</p>
        <p><strong>🍽️ 메뉴:</strong> ${menuText}</p>
        <p><strong>✅ 이미지 생성 완료!</strong></p>
    `;
    
    // 결과 영역 표시
    imageResult.style.display = 'block';
    
    console.log('✅ 이미지 표시 완료:', imageUrl);
}

// ===================================
// [개발 참고] Mock 서버 응답 (테스트용)
// ===================================

/**
 * ⚠️ 이 함수는 실제 서버가 없을 때 테스트용으로 사용
 * 실제 배포 시에는 위의 requestImageGeneration()에서
 * 실제 서버 API를 호출하도록 수정해야 함
 */
async function mockImageGeneration(date, menu) {
    // 2초 대기 (서버 처리 시간 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock 이미지 URL 반환 (실제로는 Gemini가 생성한 이미지 URL)
    // 테스트용으로 placeholder 이미지 서비스 사용
    const menuText = encodeURIComponent(menu.join(', '));
    const mockImageUrl = `https://via.placeholder.com/600x400/FF6B35/FFFFFF?text=${menuText}`;
    
    return mockImageUrl;
}

/**
 * [확장 지점] 실제 Gemini API를 직접 호출하는 함수
 * 
 * ⚠️ 주의: 
 * - 프론트엔드에서 직접 API 키를 노출하면 안 됩니다!
 * - 반드시 서버를 거쳐서 호출해야 합니다
 * - 이 함수는 참고용 예시일 뿐, 실제로는 서버에서 구현해야 함
 * 
 * @param {string} prompt - 이미지 생성 프롬프트
 * @returns {Promise<string>} - 생성된 이미지 URL
 */
async function generateImageWithGeminiDirect(prompt) {
    // TODO: 실제 Gemini API 연동 (서버에서 구현해야 함!)
    /*
    const GEMINI_API_KEY = 'YOUR_API_KEY'; // ⚠️ 절대 프론트엔드에 노출하지 말 것!
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            }
        })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].inlineData.data; // base64 이미지
    */
    
    throw new Error('이 함수는 서버에서 구현해야 합니다!');
}

// ===================================
// 초기화 코드
// ===================================

console.log('✅ 급식 식단표 웹앱 초기화 완료');
console.log('📌 PDF 파일을 업로드하면 자동으로 메뉴를 파싱합니다');
