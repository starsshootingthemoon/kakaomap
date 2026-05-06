/* =========================================================
   taxi-call.js — 택시 호출 확인 (autoload=false)
   ========================================================= */

const $sr       = document.getElementById('sr-announce');
const $barStart = document.getElementById('bar-start');
const $barDest  = document.getElementById('bar-dest');
const $typeName = document.getElementById('type-name');
const $fare     = document.getElementById('fare-amount');
const $btnCall  = document.getElementById('btn-call');
const $tabMid   = document.getElementById('tab-mid');
const $tabLarge = document.getElementById('tab-large');

function announce(text) {
  $sr.textContent = '';
  requestAnimationFrame(() => { $sr.textContent = text; });
}

const startAddr = sessionStorage.getItem('pin_start_addr') || '출발지';
const destName  = sessionStorage.getItem('pin_dest_name')  || '도착지';
const taxiType  = sessionStorage.getItem('taxi_type')       || '일반호출';

$barStart.textContent = startAddr.length > 10 ? startAddr.slice(0, 10) + '…' : startAddr;
$barDest.textContent  = destName.length  > 10 ? destName.slice(0, 10)  + '…' : destName;
$typeName.textContent = taxiType;

const FARES = {
  '블루파트너스': '7,800원', '블루파트너스 예약': '7,800원',
  '일반호출': '4,800원', '벤티 예약': '12,000원', '블랙 예약': '15,000원'
};
$fare.textContent = FARES[taxiType] || '4,800원';

/* 차종 탭 */
$tabMid.addEventListener('click', () => {
  $tabMid.classList.add('size-tab-active');   $tabMid.setAttribute('aria-pressed', 'true');
  $tabLarge.classList.remove('size-tab-active'); $tabLarge.setAttribute('aria-pressed', 'false');
  $fare.textContent = FARES[taxiType] || '4,800원';
});
$tabLarge.addEventListener('click', () => {
  $tabLarge.classList.add('size-tab-active'); $tabLarge.setAttribute('aria-pressed', 'true');
  $tabMid.classList.remove('size-tab-active');   $tabMid.setAttribute('aria-pressed', 'false');
  const base = parseInt((FARES[taxiType] || '4,800원').replace(/[^0-9]/g, ''), 10);
  $fare.textContent = (base + 2000).toLocaleString() + '원';
});

/* 호출하기 → route.html */
$btnCall.addEventListener('click', () => {
  announce('택시를 호출합니다. 경로 안내 화면으로 이동합니다.');
  setTimeout(() => { window.location.href = 'route.html'; }, 600);
});

/* 카카오맵 — 경로 폴리라인 */
kakao.maps.load(() => {
  const startLat = parseFloat(sessionStorage.getItem('pin_start_lat') || 37.5920);
  const startLng = parseFloat(sessionStorage.getItem('pin_start_lng') || 127.0165);
  const destLat  = parseFloat(sessionStorage.getItem('pin_dest_lat')  || 37.5950);
  const destLng  = parseFloat(sessionStorage.getItem('pin_dest_lng')  || 127.0195);

  const map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng((startLat + destLat) / 2, (startLng + destLng) / 2),
    level: 4
  });

  new kakao.maps.Polyline({
    path: [
      new kakao.maps.LatLng(startLat, startLng),
      new kakao.maps.LatLng((startLat + destLat) / 2, (startLng + destLng) / 2 - 0.001),
      new kakao.maps.LatLng(destLat, destLng)
    ],
    strokeWeight: 6,
    strokeColor: '#066aeb',
    strokeOpacity: 0.95,
    strokeStyle: 'solid'
  }).setMap(map);

  [{ lat: startLat, lng: startLng, color: '#4f5763', label: '출발' },
   { lat: destLat,  lng: destLng,  color: '#e03131', label: '도착' }].forEach(({ lat, lng, color, label }) => {
    new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat, lng),
      content: `<div style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,.3);white-space:nowrap">${label}</div>`,
      yAnchor: 1.5
    }).setMap(map);
  });

  const bounds = new kakao.maps.LatLngBounds(
    new kakao.maps.LatLng(Math.min(startLat, destLat) - 0.003, Math.min(startLng, destLng) - 0.003),
    new kakao.maps.LatLng(Math.max(startLat, destLat) + 0.003, Math.max(startLng, destLng) + 0.003)
  );
  map.setBounds(bounds);
});
