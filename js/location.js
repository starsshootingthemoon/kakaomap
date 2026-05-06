/* =========================================================
   상수
   ========================================================= */
const ANNOUNCE_DELAY_MS  = 900;
const DEFAULT_LEVEL      = 3;
const FALLBACK_LAT       = 37.5927;
const FALLBACK_LNG       = 127.0168;
const DRAG_DAMPING       = 0.45;
const POI_SEARCH_RADIUS  = 200;
const POI_NEAR_LIMIT     = 100;   // "앞입니다" 판정 거리 (미터)
const WALK_SPEED_MPM     = 67;

/* =========================================================
   대표성 점수 테이블
   ---------------------------------------------------------
   점수가 높을수록 대표 장소로 선택될 확률이 높다.
   같은 점수면 거리가 가까운 쪽이 선택된다.
   ========================================================= */
const CHAIN_KEYWORDS = {
  // 편의점 (누구나 아는 랜드마크)
  'GS25': 5, 'CU': 5, '세븐일레븐': 5, '이마트24': 5, '미니스톱': 5,
  // 대형 카페 체인
  '스타벅스': 5, '이디야': 4, '투썸플레이스': 4, '메가커피': 4,
  '빽다방': 4, '컴포즈커피': 4, '할리스': 4, '파스쿠찌': 4,
  // 패스트푸드 / 대형 프랜차이즈
  '맥도날드': 5, '버거킹': 5, '롯데리아': 5, 'KFC': 5,
  '서브웨이': 4, '파리바게뜨': 4, '뚜레쥬르': 4, 'BHC': 3,
  '교촌치킨': 3, 'BBQ': 3,
  // 은행
  '국민은행': 5, '신한은행': 5, '우리은행': 5, '하나은행': 5,
  'NH농협': 4, '기업은행': 4,
  // 생활
  '올리브영': 4, '다이소': 4,
  // 대형마트
  '이마트': 5, '홈플러스': 5, '롯데마트': 5,
};

/** 카테고리 기본 점수 (체인 매칭 안 될 때) */
const CAT_BASE_SCORE = {
  'SW8': 6,   // 지하철역 — 최고 대표성
  'BK9': 3,   // 은행
  'CS2': 3,   // 편의점
  'CE7': 2,   // 카페
  'FD6': 1,   // 음식점
};

/**
 * POI의 대표성 점수를 반환한다.
 */
function getLandmarkScore(poi) {
  if (poi.cat === 'SW8') return 6;

  for (const [keyword, score] of Object.entries(CHAIN_KEYWORDS)) {
    if (poi.name.includes(keyword)) return score;
  }

  return CAT_BASE_SCORE[poi.cat] || 1;
}

/**
 * 100m 이내 POI 중 대표성 점수가 가장 높고,
 * 같은 점수면 가장 가까운 POI 1개를 고른다.
 */
function pickBestPoi(pois) {
  const candidates = pois.filter(p => p.dist < POI_NEAR_LIMIT);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const sa = getLandmarkScore(a);
    const sb = getLandmarkScore(b);
    if (sb !== sa) return sb - sa;   // 점수 높은 순
    return a.dist - b.dist;          // 같으면 가까운 순
  });

  return candidates[0];
}

/* =========================================================
   DOM
   ========================================================= */
const $splash   = document.getElementById('splash');
const $app      = document.getElementById('app');
const $mapEl    = document.getElementById('map');
const $pin      = document.getElementById('center-pin');
const $locName  = document.getElementById('location-name');
const $announce = document.getElementById('announce-region');
const $btnMyLoc = document.getElementById('btn-my-location');
const $btnConf  = document.getElementById('btn-confirm');

/* =========================================================
   상태
   ========================================================= */
let map         = null;
let geocoder    = null;
let places      = null;
let geoPos      = null;
let timer       = null;
let dragging    = false;
let lastPtrX    = 0;
let lastPtrY    = 0;
let activePtrId = null;
let requestGen  = 0;

/* =========================================================
   음성 안내 (Web Speech API)
   ========================================================= */
let speechUnlocked = false;
let koVoice        = null;

function unlockSpeech() {
  if (speechUnlocked) return;
  speechUnlocked = true;
  const empty = new SpeechSynthesisUtterance('');
  empty.lang   = 'ko-KR';
  empty.volume = 0;
  speechSynthesis.speak(empty);
}

function pickKoreanVoice() {
  if (koVoice) return koVoice;
  const voices = speechSynthesis.getVoices();
  koVoice = voices.find(v => v.lang.startsWith('ko')) || null;
  return koVoice;
}

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.addEventListener('voiceschanged', () => {
    koVoice = null;
    pickKoreanVoice();
  });
}

function speakText(text) {
  if (!speechUnlocked || !text) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'ko-KR';
  utt.rate  = 1.05;
  utt.pitch = 1.0;
  const voice = pickKoreanVoice();
  if (voice) utt.voice = voice;
  speechSynthesis.speak(utt);
}

/* =========================================================
   유틸
   ========================================================= */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================================================
   주변 정보 수집
   ---------------------------------------------------------
   역지오코딩 1건 + 카테고리 5종 = 총 6건 병렬
   CE7 카페 · CS2 편의점 · FD6 음식점 · SW8 지하철역 · BK9 은행
   ========================================================= */
const SEARCH_CATS = ['CE7', 'CS2', 'FD6', 'SW8', 'BK9'];

function gatherLocationInfo(lat, lng, gen, callback) {
  const pinPos = new kakao.maps.LatLng(lat, lng);
  const info   = { address: null, roadName: null, pois: [] };
  let pending  = 1 + SEARCH_CATS.length;

  function done() {
    if (--pending > 0) return;
    if (gen !== requestGen) return;
    callback(info);
  }

  geocoder.coord2Address(lng, lat, (res, status) => {
    if (status === kakao.maps.services.Status.OK && res.length > 0) {
      const r = res[0];
      info.address  = r.road_address ? r.road_address.address_name
                                     : r.address.address_name;
      info.roadName = r.road_address ? r.road_address.road_name : null;
    }
    done();
  });

  SEARCH_CATS.forEach(cat => {
    places.categorySearch(cat, (data, status) => {
      if (status === kakao.maps.services.Status.OK && data) {
        data.slice(0, 5).forEach(p => {
          info.pois.push({
            name: p.place_name,
            dist: haversine(lat, lng, parseFloat(p.y), parseFloat(p.x)),
            cat: cat,
          });
        });
      }
      done();
    }, {
      location: pinPos,
      radius: POI_SEARCH_RADIUS,
      sort: kakao.maps.services.SortBy.DISTANCE,
    });
  });
}

/* =========================================================
   안내문 조합
   ---------------------------------------------------------
   ① 대표성 점수 기반 POI 1개 → "○○ 앞입니다."
   ② 대표 POI 없으면 도로명주소 fallback
   ③ 주변 장소 나열 금지
   ④ 거리 + 도보 시간 1문장
   ⑤ 승차 적합성 1문장
   ========================================================= */
function composeAnnouncement(lat, lng, info) {
  const parts = [];
  const mainPoi = pickBestPoi(info.pois);

  /* ① 핀 위치 */
  if (mainPoi) {
    parts.push(`현재 핀 위치는 ${mainPoi.name} 앞입니다.`);
  } else if (info.address) {
    parts.push(`현재 핀 위치는 ${info.address}입니다.`);
  } else {
    parts.push('현재 핀 위치를 확인할 수 없습니다.');
  }

  /* ② 거리 · 도보 시간 */
  if (geoPos) {
    const dist    = haversine(geoPos.lat, geoPos.lng, lat, lng);
    const meters  = Math.round(dist);
    const walkMin = Math.max(1, Math.round(dist / WALK_SPEED_MPM));

    if (meters < 20) {
      parts.push('현재 위치 바로 근처입니다.');
    } else {
      parts.push(`현재 위치에서 약 ${meters}미터, 도보 ${walkMin}분 거리입니다.`);
    }
  }

  /* ③ 승차 적합성 */
  if (mainPoi && mainPoi.cat === 'SW8') {
    parts.push('지하철역 앞이라 택시 승차 위치로 적절합니다.');
  } else if (mainPoi) {
    if (info.roadName && info.roadName.includes('대로')) {
      parts.push('대로변이라 택시 승차 위치로 적절합니다.');
    } else if (info.roadName && (/로$/.test(info.roadName) || /로\d/.test(info.roadName))) {
      parts.push('도로변이라 택시 승차 위치로 적절합니다.');
    } else {
      parts.push('주변에서 찾기 쉬운 상점 앞이라 승차 위치로 적절합니다.');
    }
  } else if (info.roadName) {
    if (info.roadName.includes('대로')) {
      parts.push('대로변이라 택시 승차 위치로 적절합니다.');
    } else if (/로$/.test(info.roadName) || /로\d/.test(info.roadName)) {
      parts.push('도로변이라 택시 승차 위치로 적절합니다.');
    } else if (info.roadName.includes('길')) {
      parts.push('골목길 부근이므로 큰 도로 쪽으로 이동하면 승차가 더 편리합니다.');
    }
  }

  return parts.join(' ');
}

/* =========================================================
   하단 UI 갱신 + 음성 안내
   ========================================================= */
function updateUI(lat, lng) {
  requestGen++;
  const gen = requestGen;

  gatherLocationInfo(lat, lng, gen, (info) => {
    if (gen !== requestGen) return;

    const mainPoi = pickBestPoi(info.pois);

    $locName.textContent = mainPoi ? mainPoi.name + ' 앞'
                                   : (info.address || '알 수 없는 위치');

    const text = composeAnnouncement(lat, lng, info);
    $announce.textContent = text;

    speakText(text);
  });
}

/* =========================================================
   debounce (900ms)
   ========================================================= */
function scheduleUpdate() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!map) return;
    const ctr = map.getCenter();
    updateUI(ctr.getLat(), ctr.getLng());
  }, ANNOUNCE_DELAY_MS);
}

/* =========================================================
   커스텀 드래그
   ========================================================= */
function setupCustomDrag() {
  map.setDraggable(false);

  $mapEl.addEventListener('pointerdown', (e) => {
    if (activePtrId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    activePtrId = e.pointerId;
    dragging = true;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;

    try { $mapEl.setPointerCapture(e.pointerId); } catch (_) {}

    $pin.classList.add('lifting');

    clearTimeout(timer);
    requestGen++;
    speechSynthesis.cancel();

    unlockSpeech();
  });

  $mapEl.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePtrId) return;

    const dx = e.clientX - lastPtrX;
    const dy = e.clientY - lastPtrY;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    const proj   = map.getProjection();
    const center = map.getCenter();
    const cp     = proj.containerPointFromCoords(center);
    const np     = new kakao.maps.Point(
      cp.x - dx * DRAG_DAMPING,
      cp.y - dy * DRAG_DAMPING
    );
    const nc = proj.coordsFromContainerPoint(np);
    map.setCenter(nc);
  });

  function endDrag(e) {
    if (e.pointerId !== activePtrId) return;
    activePtrId = null;
    dragging = false;
    $pin.classList.remove('lifting');
    try { $mapEl.releasePointerCapture(e.pointerId); } catch (_) {}
    scheduleUpdate();
  }

  $mapEl.addEventListener('pointerup', endDrag);
  $mapEl.addEventListener('pointercancel', endDrag);

  $mapEl.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) e.preventDefault();
  }, { passive: false });
}

/* =========================================================
   지도 초기화
   ========================================================= */
function initMap(lat, lng) {
  const center = new kakao.maps.LatLng(lat, lng);

  map = new kakao.maps.Map($mapEl, {
    center: center,
    level: DEFAULT_LEVEL,
  });

  geocoder = new kakao.maps.services.Geocoder();
  places   = new kakao.maps.services.Places();

  setupCustomDrag();

  kakao.maps.event.addListener(map, 'zoom_changed', () => {
    clearTimeout(timer);
    speechSynthesis.cancel();
    scheduleUpdate();
  });

  updateUI(lat, lng);
}

/* =========================================================
   위치 획득
   ========================================================= */
function acquireLocation() {
  if (!navigator.geolocation) {
    boot(FALLBACK_LAT, FALLBACK_LNG);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      geoPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      boot(geoPos.lat, geoPos.lng);
    },
    () => boot(FALLBACK_LAT, FALLBACK_LNG),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

/* =========================================================
   부팅
   ========================================================= */
function boot(lat, lng) {
  $splash.classList.add('fade-out');
  $app.classList.remove('hidden');
  requestAnimationFrame(() => initMap(lat, lng));
  setTimeout(() => $splash.remove(), 500);
}

/* =========================================================
   이벤트 바인딩
   ========================================================= */
function bind() {
  $btnMyLoc.addEventListener('click', () => {
    unlockSpeech();
    if (!geoPos || !map) return;
    speechSynthesis.cancel();
    map.setCenter(new kakao.maps.LatLng(geoPos.lat, geoPos.lng));
    scheduleUpdate();
  });

  $btnConf.addEventListener('click', () => {
    unlockSpeech();
    if (!map) return;
    const ctr = map.getCenter();
    const lat = ctr.getLat();
    const lng = ctr.getLng();

    requestGen++;
    const gen = requestGen;
    gatherLocationInfo(lat, lng, gen, (info) => {
      if (gen !== requestGen) return;
      const mainPoi = pickBestPoi(info.pois);
      const name = mainPoi ? mainPoi.name + ' 앞' : (info.address || '선택한 위치');

      const msg = `출발지가 ${name}(으)로 설정되었습니다.`;
      $announce.textContent = msg;
      speakText(msg);
      console.log('[출발지 확정]', { lat, lng, name });
    });
  });

  document.addEventListener('click', unlockSpeech, { once: true });
  document.addEventListener('touchstart', unlockSpeech, { once: true });
}

/* =========================================================
   시작
   ========================================================= */
function showKakaoLoadError() {
  const origin = window.location.origin;
  $splash.classList.add('fade-out');
  $app.classList.remove('hidden');
  $locName.textContent = '지도를 불러오지 못했습니다';
  $announce.textContent =
    `카카오맵 SDK가 로드되지 않았습니다. 현재 접속 주소는 ${origin} 입니다. 이 주소가 Kakao Developers의 JavaScript SDK 도메인에 등록되어 있는지 확인하세요.`;
  setTimeout(() => {
    if ($splash && $splash.parentNode) $splash.remove();
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  bind();

  if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
    window.kakao.maps.load(() => {
      acquireLocation();
    });
  } else {
    showKakaoLoadError();
  }
});