// ===================================
// 전역 상태
// ===================================
const CONFIG = {
    NEIS_API_URL: 'https://open.neis.go.kr/hub/mealServiceDietInfo',
    API_KEY: '107e73dfab6c4572b7b0f07548ebaaf1', // ⚠️ 실제 API 키로 교체하세요!
    OFFICE_CODE: 'E10' // 인천교육청 코드 (고정)
};

let appState = {
    menuData: {},
    currentDate: '',
    currentMenu: []
};

// ===================================
// DOM 요소
// ===================================
const elements = {
    schoolCode: document.getElementById('schoolCode'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    fetchBtn: document.getElementById('fetchBtn'),
    fetchStatus: document.getElementById('fetchStatus'),
    
    dateSection: document.getElementById('dateSection'),
    dateInput: document.getElementById('dateInput'),
    searchBtn: document.getElementById('searchBtn'),
    
    menuSection: document.getElementById('menuSection'),
    selectedDate: document.getElementById('selectedDate'),
    menuList: document.getElementById('menuList'),
    
    imageSection: document.getElementById('imageSection'),
    geminiApiKey: document.getElementById('geminiApiKey'),
    generateImageBtn: document.getElementById('generateImageBtn'),
    loadingState: document.getElementById('loadingState'),
    imageResult: document.getElementById('imageResult'),
    generatedImage: document.getElementById('generatedImage'),
    imageInfo: document.getElementById('imageInfo')
};

// ===================================
// 초기화
// ===================================
function init() {
    // 오늘 날짜 기본값 설정
    const today = new Date();
    const todayStr = formatDateInput(today);
    
    elements.startDate.value = todayStr;
    elements.endDate.value = todayStr;
    
    // 이벤트 리스너
    elements.fetchBtn.addEventListener('click', handleFetchMealData);
    elements.searchBtn.addEventListener('click', handleMenuSearch);
    elements.generateImageBtn.addEventListener('click', handleImageGeneration);
    
    console.log('✅ 급식 웹앱 초기화 완료');
}

/**
 * Date를 YYYY-MM-DD 형식으로 변환
 */
function formatDateInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * YYYY-MM-DD를 YYYYMMDD로 변환
 */
function formatDateApi(dateStr) {
    return dateStr.replace(/-/g, '');
}

// ===================================
// NEIS API 호출
// ===================================
async function handleFetchMealData() {
    const schoolCode = elements.schoolCode.value.trim();
    const startDate = elements.startDate.value;
    const endDate = elements.endDate.value;
    
    // 입력 검증
    if (!schoolCode || !startDate || !endDate) {
        alert('❌ 모든 필드를 입력해주세요!');
        return;
    }
    
    // API 키 확인
    if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
        alert('❌ script.js에서 API_KEY를 실제 키로 교체해주세요!');
        return;
    }
    
    elements.fetchStatus.textContent = '📡 NEIS API 호출 중...';
    elements.fetchStatus.className = 'status-text';
    elements.fetchBtn.disabled = true;
    
    try {
        // NEIS API 호출 (인천교육청 코드 자동 사용)
        const menuData = await fetchMealDataFromNEIS(
            CONFIG.OFFICE_CODE, // 인천교육청 (E10)
            schoolCode,
            formatDateApi(startDate),
            formatDateApi(endDate)
        );
        
        // 상태 업데이트
        appState.menuData = menuData;
        
        // UI 업데이트
        const dateCount = Object.keys(menuData).length;
        elements.fetchStatus.textContent = `✅ ${dateCount}개 날짜의 급식 정보를 불러왔습니다!`;
        elements.fetchStatus.className = 'status-text success';
        
        // 다음 단계 표시
        elements.dateSection.style.display = 'block';
        elements.dateInput.value = startDate;
        
        console.log('✅ 급식 데이터:', menuData);
        
    } catch (error) {
        console.error('❌ API 호출 오류:', error);
        elements.fetchStatus.textContent = `❌ 오류: ${error.message}`;
        elements.fetchStatus.className = 'status-text error';
    } finally {
        elements.fetchBtn.disabled = false;
    }
}

/**
 * NEIS Open API로 급식 데이터 조회
 */
async function fetchMealDataFromNEIS(officeCode, schoolCode, startDate, endDate) {
    // API URL 생성
    const url = `${CONFIG.NEIS_API_URL}?KEY=${CONFIG.API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${startDate}&MLSV_TO_YMD=${endDate}`;
    
    console.log('📡 NEIS API 요청:', url);
    
    // API 호출
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 오류 응답 체크
    if (data.RESULT) {
        throw new Error(`API 오류: ${data.RESULT.MESSAGE}`);
    }
    
    // 데이터 파싱
    const menuData = parseNEISResponse(data);
    
    return menuData;
}

/**
 * NEIS API 응답을 우리가 원하는 형식으로 변환
 */
function parseNEISResponse(data) {
    const menuData = {};
    
    // mealServiceDietInfo 배열 확인
    if (!data.mealServiceDietInfo || !data.mealServiceDietInfo[1]) {
        console.warn('⚠️ 급식 데이터가 없습니다');
        return menuData;
    }
    
    const rows = data.mealServiceDietInfo[1].row;
    
    rows.forEach(row => {
        // 날짜 (YYYYMMDD → YYYY-MM-DD)
        const dateStr = row.MLSV_YMD;
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        // 메뉴 (DDISH_NM 필드)
        // 형식: "보리밥<br/>스팸짜글이(1.2.5.6.10.13.15.16)<br/>소불고기(5.6.13.16)<br/>..."
        const dishName = row.DDISH_NM;
        
        // 메뉴 정리
        const cleanedMenu = cleanMenuText(dishName);
        
        if (cleanedMenu.length > 0) {
            menuData[formattedDate] = cleanedMenu;
        }
    });
    
    return menuData;
}

/**
 * 메뉴 텍스트 정리
 * - <br/> 기준으로 분리
 * - 알레르기 정보 (괄호) 제거
 * - 빈 줄 제거
 */
function cleanMenuText(text) {
    if (!text) return [];
    
    // <br/> 또는 <br> 기준으로 분리
    const items = text.split(/<br\s*\/?>/i);
    
    // 알레르기 정보 제거 및 정리
    const cleaned = items
        .map(item => {
            // 알레르기 정보 제거: (1.2.5.6) 같은 괄호 제거
            let clean = item.replace(/\([0-9\.\s]+\)/g, '').trim();
            // 공백 정리
            clean = clean.replace(/\s+/g, ' ');
            return clean;
        })
        .filter(item => item.length > 0); // 빈 항목 제거
    
    return cleaned;
}

// ===================================
// 메뉴 검색 & 표시
// ===================================
function handleMenuSearch() {
    const date = elements.dateInput.value;
    
    if (!date) {
        alert('❌ 날짜를 선택해주세요!');
        return;
    }
    
    const menu = appState.menuData[date];
    
    if (!menu || menu.length === 0) {
        elements.selectedDate.textContent = formatKoreanDate(date);
        elements.menuList.innerHTML = '<p class="no-menu">📭 해당 날짜의 급식 정보가 없습니다</p>';
    } else {
        appState.currentDate = date;
        appState.currentMenu = menu;
        
        elements.selectedDate.textContent = formatKoreanDate(date);
        elements.menuList.innerHTML = menu.map(item => 
            `<div class="menu-item">${item}</div>`
        ).join('');
    }
    
    elements.menuSection.style.display = 'block';
    elements.imageSection.style.display = 'block';
}

/**
 * 날짜를 한글 형식으로 변환
 */
function formatKoreanDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

// ===================================
// 이미지 생성 (Gemini API)
// ===================================
async function handleImageGeneration() {
    if (!appState.currentMenu || appState.currentMenu.length === 0) {
        alert('❌ 먼저 날짜를 선택하고 메뉴를 확인해주세요!');
        return;
    }
    
    const apiKey = elements.geminiApiKey.value.trim();
    
    if (!apiKey) {
        alert('❌ Gemini API 키를 입력해주세요!\n\nhttps://aistudio.google.com/app/apikey 에서 발급받을 수 있습니다.');
        return;
    }
    
    elements.generateImageBtn.disabled = true;
    elements.loadingState.style.display = 'block';
    elements.imageResult.style.display = 'none';
    
    try {
        const imageUrl = await generateImageWithGemini(appState.currentMenu, apiKey);
        
        elements.generatedImage.src = imageUrl;
        elements.imageInfo.textContent = `📅 ${formatKoreanDate(appState.currentDate)} | 🍽️ ${appState.currentMenu.join(', ')}`;
        
        elements.loadingState.style.display = 'none';
        elements.imageResult.style.display = 'block';
        
    } catch (error) {
        alert(`❌ 이미지 생성 실패: ${error.message}`);
        elements.loadingState.style.display = 'none';
    } finally {
        elements.generateImageBtn.disabled = false;
    }
}

/**
 * Gemini로 이미지 생성
 */
async function generateImageWithGemini(menu, apiKey) {
    const prompt = `A realistic photo of Korean school lunch on a cafeteria tray. The meal includes: ${menu.join(', ')}. Natural lighting, appetizing presentation, high quality food photography.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.4
            }
        })
    });

    if (!response.ok) {
        throw new Error('이미지 생성 실패');
    }

    const data = await response.json();
    const base64Image = data.candidates[0].content.parts[0].inline_data.data;
    
    return `data:image/png;base64,${base64Image}`;
}

// ===================================
// 앱 시작
// ===================================
init();
