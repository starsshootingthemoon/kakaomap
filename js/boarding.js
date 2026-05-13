/* =========================================================
   boarding.js — 탑승 보조 화면
   두 상태:
     is-wrong   : 빨간 배너 "탑승 위치와 현위치가 반대입니다"
     is-correct : 초록 배너 "경로에 맞게 잘 가고 있습니다"
   ========================================================= */

const MAP_WRONG   = 'https://www.figma.com/api/mcp/asset/9b05a7f2-fd48-475c-aa27-2a9048db8fb3';
const MAP_CORRECT = 'https://www.figma.com/api/mcp/asset/36079385-022c-4e0f-b3a6-7b1325f603d4';

const TTS = {
  wrong:   '탑승 위치와 현위치가 반대입니다. 반대편으로 이동해 주세요.',
  correct: '경로에 맞게 잘 가고 있습니다. 이 위치에서 택시를 기다려 주세요.',
};

const TEXT = {
  wrong:   '탑승 위치와 현위치가<br>반대입니다',
  correct: '경로에 맞게 잘 가고 있습니다',
};

const $screen     = document.getElementById('boarding-screen');
const $mapBg      = document.getElementById('map-bg');
const $bannerText = document.getElementById('banner-text');
const $srAnnounce = document.getElementById('sr-announce');

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
  utter.lang  = 'ko-KR';
  utter.rate  = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

function vibrate(pattern) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

function setState(state) {
  /* 클래스 교체 */
  $screen.classList.remove('is-wrong', 'is-correct');
  $screen.classList.add('is-' + state);

  /* 배너 텍스트 교체 */
  if ($bannerText) $bannerText.innerHTML = TEXT[state];

  /* 지도 이미지 교체 */
  if ($mapBg) $mapBg.src = state === 'correct' ? MAP_CORRECT : MAP_WRONG;

  /* TTS + 진동 */
  if (state === 'wrong') {
    vibrate([250, 100, 250, 100, 400]);
    setTimeout(() => speakText(TTS.wrong), 400);
  } else {
    vibrate([120]);
    setTimeout(() => speakText(TTS.correct), 400);
  }
}

/* 데모 자동 전환: wrong → correct (4초 후)
   실제 GPS 로직 붙이면 setState()만 호출하면 됨 */
function startDemo() {
  setState('wrong');
  setTimeout(() => setState('correct'), 4000);
}

window.addEventListener('load', () => {
  /* URL 파라미터로 상태 지정 가능: ?state=correct */
  const params = new URLSearchParams(location.search);
  const initState = params.get('state') === 'correct' ? 'correct' : 'wrong';

  if (initState === 'correct') {
    setState('correct');
  } else {
    startDemo();
  }
});
