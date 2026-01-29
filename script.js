// ===================================
// 전역 상태
// ===================================
const CONFIG = {
    NEIS_API_URL: 'https://open.neis.go.kr/hub/mealServiceDietInfo',
    NEIS_API_KEY: '107e73dfab6c4572b7b0f07548ebaaf1', // ⚠️ NEIS API 키 입력
    HUGGINGFACE_API_KEY: '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', // ⚠️ Hugging Face 토큰 입력
    OFFICE_CODE: 'E10' // 인천교육청 (고정)
};

let appState = {
    currentDate: '',
    currentMenu: []
};

// ===================================
// DOM 요소
// ===================================
const elements = {
    schoolCode: document.getElementById('schoolCode'),
    selectedDate: document.getElementById('selectedDate'),
    fetchBtn: document.getElementById('fetchBtn'),
    fetchStatus: document.getElementById('fetchStatus'),
    
    menuSection: document.getElementById('menuSection'),
    selectedDateDisplay: document.getElementById('selectedDateDisplay'),
    menuList: document.getElementById('menuList'),
    
    imageSection: document.getElementById('imageSection'),
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
    // 오늘 날짜 기본값
    const today = new Date().toISOString().split('T')[0];
    elements.selectedDate.value = today;
    
    // 이벤트 리스너
    elements.fetchBtn.addEventListener('click', handleFetchMealData);
    elements.generateImageBtn.addEventListener('click', handleImageGeneration);
    
    console.log('✅ 급식 웹앱 초기화 완료');
}

// ===================================
// NEIS API 호출 (단일 날짜)
// ===================================
async function handleFetchMealData() {
    const schoolCode = elements.schoolCode.value.trim();
    const selectedDate = elements.selectedDate.value;
    
    // 입력 검증
    if (!schoolCode || !selectedDate) {
        alert('❌ 학교 코드와 날짜를 입력해주세요!');
        return;
    }
    
    // API 키 확인
    if (CONFIG.NEIS_API_KEY === 'YOUR_NEIS_API_KEY_HERE') {
        alert('❌ script.js에서 NEIS_API_KEY를 실제 키로 교체해주세요!');
        return;
    }
    
    elements.fetchStatus.textContent = '📡 급식 정보 조회 중...';
    elements.fetchStatus.className = 'status-text';
    elements.fetchBtn.disabled = true;
    
    try {
        // 날짜 포맷 변환 (YYYY-MM-DD → YYYYMMDD)
        const apiDate = selectedDate.replace(/-/g, '');
        
        // NEIS API 호출 (시작일 = 종료일)
        const menuData = await fetchMealDataFromNEIS(
            CONFIG.OFFICE_CODE,
            schoolCode,
            apiDate,
            apiDate // 같은 날짜
        );
        
        // 메뉴 데이터 저장
        const menu = menuData[selectedDate];
        
        if (!menu || menu.length === 0) {
            elements.fetchStatus.textContent = '📭 해당 날짜의 급식 정보가 없습니다';
            elements.fetchStatus.className = 'status-text error';
            elements.menuSection.style.display = 'none';
            elements.imageSection.style.display = 'none';
            return;
        }
        
        // 상태 업데이트
        appState.currentDate = selectedDate;
        appState.currentMenu = menu;
        
        // UI 표시
        elements.selectedDateDisplay.textContent = formatKoreanDate(selectedDate);
        elements.menuList.innerHTML = menu.map(item => 
            `<div class="menu-item">${item}</div>`
        ).join('');
        
        elements.fetchStatus.textContent = `✅ 급식 정보를 불러왔습니다!`;
        elements.fetchStatus.className = 'status-text success';
        
        elements.menuSection.style.display = 'block';
        elements.imageSection.style.display = 'block';
        
        console.log('✅ 급식 메뉴:', menu);
        
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
    const url = `${CONFIG.NEIS_API_URL}?KEY=${CONFIG.NEIS_API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${startDate}&MLSV_TO_YMD=${endDate}`;
    
    console.log('📡 NEIS API 요청:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP 오류: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 NEIS API 응답:', data);
    
    // 오류 응답 체크
    if (data.RESULT) {
        throw new Error(`API 오류: ${data.RESULT.MESSAGE}`);
    }
    
    // 데이터 파싱
    const menuData = parseNEISResponse(data);
    
    return menuData;
}

/**
 * NEIS API 응답 파싱
 */
function parseNEISResponse(data) {
    const menuData = {};
    
    if (!data.mealServiceDietInfo || !data.mealServiceDietInfo[1]) {
        console.warn('⚠️ 급식 데이터가 없습니다');
        return menuData;
    }
    
    const rows = data.mealServiceDietInfo[1].row;
    
    rows.forEach(row => {
        // 날짜 (YYYYMMDD → YYYY-MM-DD)
        const dateStr = row.MLSV_YMD;
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        // 메뉴 정리
        const cleanedMenu = cleanMenuText(row.DDISH_NM);
        
        if (cleanedMenu.length > 0) {
            menuData[formattedDate] = cleanedMenu;
        }
    });
    
    return menuData;
}

/**
 * 메뉴 텍스트 정리
 */
function cleanMenuText(text) {
    if (!text) return [];
    
    // <br/> 기준으로 분리
    const items = text.split(/<br\s*\/?>/i);
    
    // 알레르기 정보 제거 및 정리
    const cleaned = items
        .map(item => {
            let clean = item.replace(/\([0-9\.\s]+\)/g, '').trim();
            clean = clean.replace(/\s+/g, ' ');
            return clean;
        })
        .filter(item => item.length > 0);
    
    return cleaned;
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
// 이미지 생성 (Hugging Face FLUX)
// ===================================
async function handleImageGeneration() {
    if (!appState.currentMenu || appState.currentMenu.length === 0) {
        alert('❌ 먼저 급식 정보를 불러와주세요!');
        return;
    }
    
    // API 키 확인
    if (CONFIG.HUGGINGFACE_API_KEY === 'YOUR_HUGGINGFACE_TOKEN_HERE') {
        alert('❌ script.js에서 HUGGINGFACE_API_KEY를 실제 토큰으로 교체해주세요!');
        return;
    }
    
    elements.generateImageBtn.disabled = true;
    elements.loadingState.style.display = 'block';
    elements.imageResult.style.display = 'none';
    
    try {
        const imageUrl = await generateImageWithFLUX(appState.currentMenu);
        
        elements.generatedImage.src = imageUrl;
        elements.imageInfo.textContent = `📅 ${formatKoreanDate(appState.currentDate)} | 🍽️ ${appState.currentMenu.join(', ')}`;
        
        elements.loadingState.style.display = 'none';
        elements.imageResult.style.display = 'block';
        
    } catch (error) {
        console.error('이미지 생성 오류:', error);
        alert(`❌ 이미지 생성 실패: ${error.message}`);
        elements.loadingState.style.display = 'none';
    } finally {
        elements.generateImageBtn.disabled = false;
    }
}

/**
 * Hugging Face FLUX로 이미지 생성
 */
async function generateImageWithFLUX(menu) {
    const menuText = menu.join(', ');
    
    const modelId = "black-forest-labs/FLUX.1-schnell";
    const url = `https://api-inference.huggingface.co/models/${modelId}`;
    
    const prompt = `A realistic photo of a Korean elementary school lunch on a stainless steel tray with compartments, top-down view. The tray contains: ${menuText}. Natural lighting, appetizing colors, typical school cafeteria food presentation.`;
    
    console.log('📤 Hugging Face FLUX API 요청');
    console.log('🎨 프롬프트:', prompt);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: prompt
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 오류:', errorText);
        throw new Error(`Hugging Face API 오류: ${response.status}`);
    }

    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    
    console.log('✅ 이미지 생성 성공!');
    return imageUrl;
}

// ===================================
// 앱 시작
// ===================================
init();
