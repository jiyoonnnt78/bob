/* ===================================
   전역 스타일
   =================================== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 900px;
    margin: 0 auto;
}

/* ===================================
   헤더
   =================================== */
.header {
    background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
    padding: 30px 20px;
    border-radius: 20px;
    margin-bottom: 30px;
    text-align: center;
    color: white;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.header h1 {
    font-size: 2rem;
    margin-bottom: 10px;
}

.header p {
    opacity: 0.9;
    font-size: 1rem;
}

/* ===================================
   카드
   =================================== */
.card {
    background: white;
    padding: 30px;
    border-radius: 15px;
    margin-bottom: 20px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.card h2 {
    color: #333;
    margin-bottom: 20px;
    font-size: 1.5rem;
}

.info-text {
    color: #667eea;
    font-weight: bold;
    margin-bottom: 15px;
    padding: 10px;
    background: #f0f4ff;
    border-radius: 8px;
    text-align: center;
}

/* ===================================
   입력 섹션
   =================================== */
.input-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.input-group label {
    font-weight: bold;
    color: #333;
    font-size: 0.95rem;
}

.input-group input {
    padding: 12px 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s;
}

.input-group input:focus {
    outline: none;
    border-color: #667eea;
}

.input-hint {
    font-size: 0.85rem;
    color: #999;
}

.fetch-btn {
    padding: 15px 30px;
    background: #4ECDC4;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 10px;
}

.fetch-btn:hover {
    background: #45b8b0;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
}

.fetch-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.status-text {
    margin-top: 15px;
    font-size: 0.95rem;
    color: #666;
    text-align: center;
}

.status-text.success {
    color: #4CAF50;
    font-weight: bold;
}

.status-text.error {
    color: #f44336;
    font-weight: bold;
}

/* ===================================
   날짜 선택
   =================================== */
.date-selector {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-wrap: wrap;
}

.date-selector label {
    font-weight: bold;
    color: #333;
}

.date-selector input[type="date"] {
    padding: 10px 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    flex: 1;
    min-width: 200px;
}

.search-btn {
    padding: 10px 25px;
    background: #FF6B35;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s;
}

.search-btn:hover {
    background: #e65a2b;
    transform: translateY(-2px);
}

/* ===================================
   메뉴 표시
   =================================== */
.menu-display h3 {
    color: #FF6B35;
    margin-bottom: 15px;
    font-size: 1.3rem;
}

.menu-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}

.menu-item {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 10px;
    border-left: 4px solid #4ECDC4;
    font-weight: 500;
    transition: all 0.3s;
}

.menu-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
}

.no-menu {
    text-align: center;
    padding: 30px;
    color: #999;
    font-size: 1.1rem;
}

/* ===================================
   이미지 생성
   =================================== */
.image-controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.image-controls input {
    padding: 12px 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
}

.api-link {
    color: #667eea;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: bold;
    transition: color 0.3s;
}

.api-link:hover {
    color: #5568d3;
    text-decoration: underline;
}

.generate-btn {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s;
}

.generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.loading-state {
    text-align: center;
    padding: 40px;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.image-result {
    margin-top: 20px;
    text-align: center;
}

.image-result img {
    max-width: 100%;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
}

.image-result p {
    margin-top: 15px;
    color: #666;
    font-size: 0.95rem;
}

/* ===================================
   푸터
   =================================== */
.footer {
    text-align: center;
    padding: 20px;
    color: white;
    margin-top: 30px;
    opacity: 0.8;
}

/* ===================================
   반응형
   =================================== */
@media (max-width: 768px) {
    .header h1 {
        font-size: 1.5rem;
    }
    
    .card {
        padding: 20px;
    }
    
    .date-selector {
        flex-direction: column;
        align-items: stretch;
    }
    
    .menu-list {
        grid-template-columns: 1fr;
    }
}
