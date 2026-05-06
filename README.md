# 2026 HCI 카카오맵 접근성 프로토타입

시각장애인을 위한 음성 기반 택시 호출 앱 프로토타입입니다.
음성 인식, TTS(Text-to-Speech), 스크린리더를 활용해 지도 없이도 택시를 호출할 수 있는 흐름을 구현했습니다.

---

## 기술 스택

- Visual Studio Code
- Git / GitHub
- HTML / CSS / JavaScript
- Kakao Maps API
  - 지도
  - 역지오코딩
  - 장소 검색
- Web Speech API
  - 음성 인식
  - TTS

---

## 화면 흐름

voice → pin-start → pin-dest → taxi-type → taxi-call → route → walking → boarding

---

## 파일 구조

```text
2026 HCI/
├── index.html                ← 앱 시작점
├── style.css                 ← 공통 스타일 (색상 변수, 리셋)
│
├── pages/
│   ├── voice.html            ← 출발지·도착지 음성 검색
│   ├── pin-start.html        ← 지도 핀으로 출발지 위치 조정
│   ├── pin-dest.html         ← 지도 핀으로 도착지 위치 조정
│   ├── taxi-type.html        ← 택시 종류 선택
│   ├── taxi-call.html        ← 호출 확인 및 경로 시각화
│   ├── route.html            ← 출발지까지 도보 경로 안내
│   ├── walking.html          ← 도보 이동 중 네비게이션
│   ├── boarding.html         ← 승하차 보조
│   ├── location.html         ← 위치 지정 (핀 조정)
│   ├── pin-map.css           ← 핀 설정 화면 공용 스타일
│   └── 각 페이지별 .css
│
└── js/
    ├── voice.js              ← 음성 인식·TTS, 경로 안내 시작 버튼 제어
    ├── pin-start.js          ← 출발지 핀 설정, 주변 건물명 TTS
    ├── pin-dest.js           ← 도착지 핀 설정, 주변 건물명 TTS
    ├── taxi-type.js          ← 택시 종류 선택, 지도 경로 표시
    ├── taxi-call.js          ← 호출 확인, 경로 폴리라인, 차종·요금 선택
    ├── route.js              ← 도보 경로 안내 TTS, 버튼 네비게이션
    ├── walking.js            ← 도보 네비게이션 TTS (방향·거리)
    ├── boarding.js           ← 승하차 보조 기능
    └── location.js           ← 위치 지정 기능
```

---

## 주요 접근성 기능

- 마이크 버튼으로 출발지·도착지 음성 입력
- 지도 핀 드래그 시 주변 건물명(예: 버거킹 성신여대점)을 TTS로 읽어 줌
- 버튼 터치 시 다음 동작을 TTS로 안내 후 화면 전환
- aria-live 영역으로 스크린리더 실시간 상태 알림
- 도보 경로 진입 시 현위치·이동 방향 자동 음성 안내
