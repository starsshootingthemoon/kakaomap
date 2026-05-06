/* =========================================================
   walking.js — 도보 경로 안내
   ========================================================= */

const $srAnnounce = document.getElementById('sr-announce');

const NAV_TEXT = '현위치: 서울 성북구 돈암동 173-3. 10m 이동, 왼쪽 완만한 곡선';

function announce(text) {
  $srAnnounce.textContent = '';
  requestAnimationFrame(() => {
    $srAnnounce.textContent = text;
  });
}

function speakNav(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    window.speechSynthesis.speak(utter);
  }
  announce(text);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    speakNav(NAV_TEXT);
  }, 500);
});
