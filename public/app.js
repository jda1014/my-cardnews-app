document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfoArea = document.getElementById('fileInfoArea');
  const fileNameEl = document.getElementById('fileName');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  const accessCodeContainer = document.getElementById('accessCodeContainer');
  const accessCodeInput = document.getElementById('accessCodeInput');
  
  const loadingArea = document.getElementById('loadingArea');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage');
  
  const resultArea = document.getElementById('resultArea');
  const copyAllBtn = document.getElementById('copyAllBtn');
  
  const card1Content = document.getElementById('card1Content');
  const card2Content = document.getElementById('card2Content');
  const card3Content = document.getElementById('card3Content');
  
  let selectedFile = null;
  let lastAnalysisResult = null;

  // 토스트 알림 함수 (2.5초 후 자동 삭제)
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // 등장 애니메이션
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });
    
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // 파일 검증 및 설정 공통 로직
  function handleFile(file) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('PDF 파일만 업로드할 수 있습니다.');
      resetFile();
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      showToast('4MB 이하의 PDF만 업로드할 수 있습니다.');
      resetFile();
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileInfoArea.classList.remove('hidden');
    dropZone.classList.add('border-indigo-400', 'bg-indigo-50/60');
    submitBtn.removeAttribute('disabled');
    showToast('PDF 파일이 준비되었습니다.');
  }

  function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    fileInfoArea.classList.add('hidden');
    fileNameEl.textContent = '';
    dropZone.classList.remove('border-indigo-400', 'bg-indigo-50/60');
    submitBtn.setAttribute('disabled', 'true');
  }

  // 드래그 앤 드롭 이벤트
  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-100/50');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-100/50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-100/50');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
  });

  // 분석 실행 버튼 클릭 이벤트
  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      showToast('먼저 PDF 파일을 업로드해 주세요.');
      return;
    }

    // UI 상태 초기화
    errorBox.classList.add('hidden');
    resultArea.classList.add('hidden');
    loadingArea.classList.remove('hidden');
    submitBtn.setAttribute('disabled', 'true');

    try {
      const headers = {
        'Content-Type': 'application/octet-stream'
      };

      // 접속 코드 확인 (입력값 또는 sessionStorage 우선순위)
      const accessCode = accessCodeInput.value.trim() || sessionStorage.getItem('accessCode');
      if (accessCode) {
        headers['x-access-code'] = accessCode;
      }

      // PDF 원본 바이트 그대로 전송
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: headers,
        body: selectedFile
      });

      const data = await response.json();

      if (!response.ok) {
        // 접속 코드 오류 처리
        if (response.status === 401 && data.code === 'ACCESS_CODE_REQUIRED') {
          sessionStorage.removeItem('accessCode');
          accessCodeContainer.classList.remove('hidden');
          accessCodeInput.focus();
        }
        throw new Error(data.error || `요청에 실패했습니다. (HTTP 상태코드: ${response.status})`);
      }

      // 접속 코드 성공 시 세션 저장 및 입력칸 숨김
      if (accessCode) {
        sessionStorage.setItem('accessCode', accessCode);
        accessCodeContainer.classList.add('hidden');
      }

      lastAnalysisResult = data;
      renderResults(data);

    } catch (err) {
      errorMessage.textContent = err.message || '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      errorBox.classList.remove('hidden');
    } finally {
      loadingArea.classList.add('hidden');
      submitBtn.removeAttribute('disabled');
    }
  });

  // 안전한 DOM 렌더링 함수 (textContent 사용)
  function renderResults(data) {
    // 카드 1 렌더링
    card1Content.textContent = data.card1_easy_explanation || '';

    // 카드 2 렌더링 (Takeaways 3개)
    card2Content.replaceChildren();
    const takeaways = Array.isArray(data.card2_takeaways) ? data.card2_takeaways : [];
    takeaways.forEach((text, index) => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5';
      
      const badge = document.createElement('span');
      badge.className = 'flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center mt-0.5';
      badge.textContent = String(index + 1);

      const p = document.createElement('p');
      p.className = 'text-sm text-slate-700 leading-relaxed';
      p.textContent = text;

      li.appendChild(badge);
      li.appendChild(p);
      card2Content.appendChild(li);
    });

    // 카드 3 렌더링 (Card News 4장)
    card3Content.replaceChildren();
    const cardNews = Array.isArray(data.card3_card_news) ? data.card3_card_news : [];
    cardNews.forEach((text, index) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'bg-slate-900 text-slate-100 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'flex items-center justify-between';

      const slideNum = document.createElement('span');
      slideNum.className = 'text-xs font-semibold tracking-wider text-indigo-400 uppercase';
      slideNum.textContent = `Slide 0${index + 1}`;

      const tag = document.createElement('span');
      tag.className = 'text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium';
      tag.textContent = 'Card News';

      headerDiv.appendChild(slideNum);
      headerDiv.appendChild(tag);

      const p = document.createElement('p');
      p.className = 'text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-line';
      p.textContent = text;

      cardDiv.appendChild(headerDiv);
      cardDiv.appendChild(p);
      card3Content.appendChild(cardDiv);
    });

    resultArea.classList.remove('hidden');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 전체 결과 복사하기 버튼 이벤트
  copyAllBtn.addEventListener('click', async () => {
    if (!lastAnalysisResult) return;

    const takeawaysText = (lastAnalysisResult.card2_takeaways || [])
      .map((item, idx) => `${idx + 1}. ${item}`)
      .join('\n\n');

    const cardNewsText = (lastAnalysisResult.card3_card_news || [])
      .map((item, idx) => `(슬라이드 ${idx + 1})\n${item}`)
      .join('\n\n');

    const fullText = `[초등학생도 이해하는 쉬운 말 해설]
${lastAnalysisResult.card1_easy_explanation || ''}

[핵심 테이크어웨이]
${takeawaysText}

[SNS 카드뉴스 슬라이드]
${cardNewsText}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showToast('전체 결과가 클립보드에 복사되었습니다!');
    } catch (err) {
      showToast('복사에 실패했습니다. 직접 선택해서 복사해 주세요.');
    }
  });
});