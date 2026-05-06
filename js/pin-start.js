/* =========================================================
   pin-start.js — 출발지 핀 설정 (카카오맵, autoload=false)
   ========================================================= */

const $addr    = document.getElementById('start-addr');
const $reserve = document.getElementById('btn-reserve');
const $locate  = document.getElementById('btn-locate');
const $sheet   = document.querySelector('.pin-sheet');
const $sr      = document.getElementById('sr-announce');

const DEFAULT_LAT = 37.5920;
const DEFAULT_LNG = 127.0165;

/* ── TTS ─────────────────────────────────────────────── */
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  window.speechSynthesis.speak(u);
}
function announce(text) {
  $sr.textContent = '';
  requestAnimationFrame(() => { $sr.textContent = text; });
}

/* ── 하단 시트 터치 → voice.html ──────────────────────── */
$sheet.addEventListener('click', () => {
  window.location.href = 'voice.html';
});

/* ── 카카오맵 초기화 ──────────────────────────────────── */
kakao.maps.load(() => {
  const container = document.getElementById('map');
  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
    level: 3
  });
  const geocoder = new kakao.maps.services.Geocoder();
  const places   = new kakao.maps.services.Places();

  /* 주변 건물명 취득: Places categorySearch → coord2Address 순으로 시도 */
  function getNearbyName(latlng, callback) {
    const CATS = ['FD6', 'CE7', 'CS2', 'MT1', 'BK9', 'HP8', 'PM9'];
    let best = null;
    let done = 0;

    CATS.forEach(code => {
      places.categorySearch(code, (data, status) => {
        done++;
        if (status === kakao.maps.services.Status.OK && data.length > 0) {
          if (!best) best = data[0].place_name;
        }
        if (done === CATS.length) {
          if (best) { callback(best); return; }
          /* fallback: coord2Address */
          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (r, s) => {
            if (s === kakao.maps.services.Status.OK) {
              const road = r[0].road_address;
              const base = r[0].address;
              callback((road && road.building_name) || (road && road.address_name) || base.address_name);
            } else {
              callback('위치를 확인할 수 없습니다');
            }
          });
        }
      }, { location: latlng, radius: 80, sort: kakao.maps.services.SortBy.DISTANCE });
    });
  }

  /* 지도 중심 변경 시 장소명 갱신 + TTS */
  function updateLocation() {
    const center = map.getCenter();
    getNearbyName(center, name => {
      $addr.textContent = name;
      sessionStorage.setItem('pin_start_addr', name);
      sessionStorage.setItem('pin_start_lat',  center.getLat());
      sessionStorage.setItem('pin_start_lng',  center.getLng());
      speak('현위치: ' + name);
      announce('현위치: ' + name);
    });
  }

  updateLocation();
  kakao.maps.event.addListener(map, 'dragend', updateLocation);

  /* 현재 위치로 이동 */
  $locate.addEventListener('click', (e) => {
    e.stopPropagation(); // 시트 click 버블링 방지
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        updateLocation();
      },
      () => { speak('위치 정보를 가져올 수 없습니다.'); announce('위치 정보 오류'); }
    );
  });

  /* 예약하기 → TTS 후 도착지 설정으로 이동 */
  $reserve.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = sessionStorage.getItem('pin_start_addr') || '출발지';
    speak(`출발지가 ${name}로 설정되었습니다. 도착지를 선택해 주세요.`);
    announce(`출발지: ${name}`);
    setTimeout(() => { window.location.href = 'pin-dest.html'; }, 1200);
  });
});
