/* =========================================================
   route.js — 경로 안내 화면
   ========================================================= */

const $srAnnounce = document.getElementById('sr-announce');
const $btnStart   = document.getElementById('btn-start');
const $btnSkip    = document.getElementById('btn-skip');

/* 페이지 진입 시 스크린리더 안내 */
function announce(text) {
  $srAnnounce.textContent = '';
  requestAnimationFrame(() => {
    $srAnnounce.textContent = text;
  });
}

window.addEventListener('load', () => {
  setTimeout(() => {
    announce('출발지까지 경로를 안내할까요? 지정 목적지는 성신여대 정문 앞 대로변입니다.');
  }, 500);
});

/* 도보경로 안내 시작 */
$btnStart.addEventListener('click', () => {
  window.location.href = 'walking.html';
});

/* 건너뛰기 */
$btnSkip.addEventListener('click', () => {
  window.location.href = 'boarding.html';
});
