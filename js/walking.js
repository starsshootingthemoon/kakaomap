/* =========================================================
   walking.js — 도보 경로 안내
   ========================================================= */

const $srAnnounce = document.getElementById('sr-announce');
const $statusModal = document.getElementById('route-status-modal');
const $statusMessage = document.getElementById('route-status-message');

const NAV_TEXT = '현위치: 서울 성북구 돈암동 173-3. 10미터 이동, 왼쪽 완만한 곡선';

const STATUS_TEXT = {
  correct: '경로에 맞게 잘 가고 있습니다',
  wrong: '탑승 위치와 현위치가 반대입니다',
};

function announce(text) {
  if (!$srAnnounce) return;

  $srAnnounce.textContent = '';

  requestAnimationFrame(() => {
    $srAnnounce.textContent = text;
  });
}

function speakText(text) {
  announce(text);

  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 1;
  utter.pitch = 1;

  window.speechSynthesis.speak(utter);
}

function showRouteStatus(type) {
  if (!$statusModal || !$statusMessage) return;

  const message = STATUS_TEXT[type];

  $statusModal.classList.remove('hidden', 'is-correct', 'is-wrong');
  $statusModal.classList.add(type === 'wrong' ? 'is-wrong' : 'is-correct');

  $statusMessage.textContent = message;

  speakText(message);

  if ('vibrate' in navigator) {
    if (type === 'wrong') {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } else {
      navigator.vibrate([120]);
    }
  }
}

function hideRouteStatus() {
  if (!$statusModal) return;

  $statusModal.classList.add('hidden');
  $statusModal.classList.remove('is-correct', 'is-wrong');
}

/* 테스트용 상태 변경
   실제 GPS/경로 판단 로직 붙이면 여기서 correct/wrong만 호출하면 됨 */
function checkRouteDirection(isCorrect) {
  if (isCorrect) {
    showRouteStatus('correct');
  } else {
    showRouteStatus('wrong');
  }
}

window.addEventListener('load', () => {
  setTimeout(() => {
    speakText(NAV_TEXT);
  }, 500);

  /* 임시 테스트:
     1초 뒤 정상 모달 표시
     wrong 테스트하려면 true를 false로 바꾸기 */
  setTimeout(() => {
    checkRouteDirection(true);
  }, 1200);
});