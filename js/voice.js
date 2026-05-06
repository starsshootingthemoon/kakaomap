/* =========================================================
   voice.js — 음성 검색 기능
   =========================================================
   - 출발지 / 도착지 마이크 버튼 클릭 → 모달 열림
   - Web Speech API로 음성 인식
   - 결과 확정 → 검색창에 입력
   - 보이스오버(VoiceOver) / 스크린리더 대응
   ========================================================= */

/* =========================================================
   DOM
   ========================================================= */
const $micStart   = document.getElementById('mic-start');
const $micArrive  = document.getElementById('mic-arrive');
const $inputStart = document.getElementById('input-start');
const $inputArrive= document.getElementById('input-arrive');

const $modal      = document.getElementById('modal-voice');
const $modalDim   = document.getElementById('modal-dim');
const $message    = document.getElementById('modal-message');
const $result     = document.getElementById('modal-result');
const $btnSpeak   = document.getElementById('btn-speak');
const $btnRespeak = document.getElementById('btn-respeak');
const $btnConfirm = document.getElementById('btn-confirm');
const $srStatus   = document.getElementById('sr-status');

/* =========================================================
   상태
   ========================================================= */
let currentTarget = null;   // 'start' | 'arrive'
let recognition   = null;
let isListening   = false;
let lastResult    = '';

/* =========================================================
   스크린리더 알림
   ========================================================= */
function announce(text) {
  $srStatus.textContent = '';
  requestAnimationFrame(() => {
    $srStatus.textContent = text;
  });
}

/* =========================================================
   음성 인식 초기화 (Web Speech API)
   ========================================================= */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function setupRecognition() {
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.lang = 'ko-KR';
  rec.continuous = false;
  rec.interimResults = true;

  rec.onstart = () => {
    isListening = true;
    setListeningUI(true);
    announce('음성 인식 중입니다. 장소명을 말해보세요.');
  };

  rec.onresult = (e) => {
    let interim = '';
    let final   = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    const display = final || interim;
    lastResult = final || lastResult;

    $result.textContent = display || '...';
    $result.classList.remove('hidden');
  };

  rec.onend = () => {
    isListening = false;
    setListeningUI(false);
    if (lastResult) {
      announce(`인식된 텍스트: ${lastResult}. 확정하려면 확정하기 버튼을 누르세요.`);
    } else {
      announce('음성이 인식되지 않았습니다. 다시 말하기 버튼을 눌러보세요.');
    }
  };

  rec.onerror = (e) => {
    isListening = false;
    setListeningUI(false);
    console.warn('[SpeechRecognition error]', e.error);
    if (e.error === 'not-allowed') {
      $message.textContent = '마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.';
      announce('마이크 권한이 거부되었습니다.');
    } else {
      announce('음성 인식 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  return rec;
}

/* =========================================================
   UI 상태 전환
   ========================================================= */
function setListeningUI(on) {
  if (on) {
    $btnSpeak.classList.remove('speak-btn--off');
    $btnSpeak.classList.add('speak-btn--on');
    $btnSpeak.setAttribute('aria-label', '음성 인식 중. 탭하면 중지');
    $message.style.color = 'rgba(0,0,0,0.41)';
  } else {
    $btnSpeak.classList.remove('speak-btn--on');
    $btnSpeak.classList.add('speak-btn--off');
    $btnSpeak.setAttribute('aria-label', '음성 인식 시작');
    $message.style.color = '#111';
  }
}

/* =========================================================
   모달 열기 / 닫기
   ========================================================= */
function openModal(target) {
  currentTarget = target;
  lastResult    = '';

  $result.textContent = '...';
  $result.classList.add('hidden');
  $message.textContent = target === 'start'
    ? '출발지 장소명을 말해보세요.'
    : '도착지 장소명을 말해보세요.';

  setListeningUI(false);
  $modal.classList.remove('hidden');
  $modal.removeAttribute('aria-hidden');

  // 포커스 이동 (접근성)
  setTimeout(() => $btnSpeak.focus(), 100);

  announce($message.textContent + ' 마이크 버튼을 눌러 시작하세요.');
}

function closeModal() {
  stopListening();
  $modal.classList.add('hidden');
  $modal.setAttribute('aria-hidden', 'true');

  // 포커스 원위치
  if (currentTarget === 'start') $micStart.focus();
  else $micArrive.focus();
}

/* =========================================================
   음성 인식 시작 / 중지
   ========================================================= */
function startListening() {
  if (!SpeechRecognition) {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 또는 Edge를 사용해 주세요.');
    return;
  }
  lastResult = '';
  recognition = setupRecognition();
  try {
    recognition.start();
  } catch (e) {
    console.warn(e);
  }
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

/* =========================================================
   결과 확정
   ========================================================= */
function confirmResult() {
  if (!lastResult) {
    announce('인식된 텍스트가 없습니다. 다시 말하기를 눌러 주세요.');
    return;
  }

  if (currentTarget === 'start') {
    $inputStart.value = lastResult;
    $inputStart.style.color = '#111827';
    announce(`출발지가 ${lastResult}(으)로 설정되었습니다.`);
  } else {
    $inputArrive.value = lastResult;
    $inputArrive.style.color = '#111827';
    announce(`도착지가 ${lastResult}(으)로 설정되었습니다.`);
  }

  closeModal();
}

/* =========================================================
   이벤트 바인딩
   ========================================================= */
// 마이크 버튼 (출발지 / 도착지)
$micStart.addEventListener('click',  () => openModal('start'));
$micArrive.addEventListener('click', () => openModal('arrive'));

// 검색창 클릭해도 모달 열림
$inputStart.addEventListener('click',  () => openModal('start'));
$inputArrive.addEventListener('click', () => openModal('arrive'));

// 마이크 큰 버튼
$btnSpeak.addEventListener('click', () => {
  if (isListening) stopListening();
  else startListening();
});

// 다시 말하기
$btnRespeak.addEventListener('click', () => {
  lastResult = '';
  $result.textContent = '...';
  $result.classList.add('hidden');
  startListening();
});

// 확정하기
$btnConfirm.addEventListener('click', confirmResult);

// 배경 딤 클릭 → 모달 닫기
$modalDim.addEventListener('click', closeModal);

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$modal.classList.contains('hidden')) {
    closeModal();
  }
});

// 최근 내역 "도착" 버튼
document.querySelectorAll('.btn-arrive').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const name = e.target.closest('.recent-item')
                          .querySelector('.recent-name').textContent;
    $inputArrive.value = name;
    $inputArrive.style.color = '#111827';
    announce(`도착지가 ${name}(으)로 설정되었습니다.`);
  });
});