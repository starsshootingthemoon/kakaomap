/* =========================================================
   taxi-type.js — 택시 종류 선택 (autoload=false)
   ========================================================= */

const $sr       = document.getElementById('sr-announce');
const $barStart = document.getElementById('bar-start');
const $barDest  = document.getElementById('bar-dest');
const $tabAll   = document.getElementById('tab-all');
const $tabSched = document.getElementById('tab-schedule');

function announce(text) {
  $sr.textContent = '';
  requestAnimationFrame(() => { $sr.textContent = text; });
}

/* 출발지/도착지 표시 */
const startAddr = sessionStorage.getItem('pin_start_addr') || '출발지';
const destName  = sessionStorage.getItem('pin_dest_name')  || '도착지';
$barStart.textContent = startAddr.length > 10 ? startAddr.slice(0, 10) + '…' : startAddr;
$barDest.textContent  = destName.length  > 10 ? destName.slice(0, 10)  + '…' : destName;

/* 탭 전환 */
$tabAll.addEventListener('click', () => {
  $tabAll.classList.add('tab-active');   $tabAll.setAttribute('aria-selected', 'true');
  $tabSched.classList.remove('tab-active'); $tabSched.setAttribute('aria-selected', 'false');
});
$tabSched.addEventListener('click', () => {
  $tabSched.classList.add('tab-active'); $tabSched.setAttribute('aria-selected', 'true');
  $tabAll.classList.remove('tab-active');   $tabAll.setAttribute('aria-selected', 'false');
});

/* 택시 항목 클릭 */
document.querySelectorAll('.taxi-item').forEach(item => {
  const select = () => {
    const type = item.dataset.type;
    sessionStorage.setItem('taxi_type', type);
    announce(`${type} 선택됨. 호출 확인 화면으로 이동합니다.`);
    window.location.href = 'taxi-call.html';
  };
  item.addEventListener('click', select);
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
  });
});

/* 카카오맵 */
kakao.maps.load(() => {
  const startLat = parseFloat(sessionStorage.getItem('pin_start_lat') || 37.5920);
  const startLng = parseFloat(sessionStorage.getItem('pin_start_lng') || 127.0165);
  const destLat  = parseFloat(sessionStorage.getItem('pin_dest_lat')  || 37.5950);
  const destLng  = parseFloat(sessionStorage.getItem('pin_dest_lng')  || 127.0195);

  const map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng((startLat + destLat) / 2, (startLng + destLng) / 2),
    level: 4
  });

  const bounds = new kakao.maps.LatLngBounds(
    new kakao.maps.LatLng(Math.min(startLat, destLat) - 0.002, Math.min(startLng, destLng) - 0.002),
    new kakao.maps.LatLng(Math.max(startLat, destLat) + 0.002, Math.max(startLng, destLng) + 0.002)
  );
  map.setBounds(bounds);

  [{ lat: startLat, lng: startLng, color: '#4f5763' },
   { lat: destLat,  lng: destLng,  color: '#066aeb' }].forEach(({ lat, lng, color }) => {
    new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat, lng),
      content: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
      yAnchor: 0.5
    }).setMap(map);
  });
});
