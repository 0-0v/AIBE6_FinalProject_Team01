# Pramingo Frontend

기존 Vite SPA 화면을 보존하면서 Next.js App Router로 마이그레이션한 프론트엔드입니다.

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4 / shadcn/ui
- Zustand
- Google Maps API (`@vis.gl/react-google-maps`)
- Browser WebSocket / WebRTC API
- ESLint 9

## Local Setup

1. `.env`에 Google Maps 키 등 필요한 값을 입력합니다.
2. 패키지를 설치하고 개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: 백엔드 API 주소
- `NEXT_PUBLIC_WS_URL`: WebSocket 연결 주소
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: 브라우저용 Google Maps API 키
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`: Google Maps Map ID
- `NEXT_PUBLIC_WEBRTC_ICE_SERVERS`: 운영 ICE 서버 설정

`NEXT_PUBLIC_` 변수는 브라우저에 공개됩니다. Google Maps 키에는 HTTP referrer와 API 사용 범위 제한을 반드시 적용합니다. 서버 전용 비밀키는 프론트엔드 환경변수에 저장하지 않습니다.

## Global Modal

브라우저 `alert` 대신 전역 모달을 사용합니다. React 컴포넌트 밖에서도 호출할 수 있습니다.

```tsx
import { globalModal } from '@/stores/global-modal-store';

globalModal.open({
    title: '저장 완료',
    description: '여행 정보가 저장되었습니다.',
});
```

확인과 취소가 모두 필요한 경우 `showCancel: true`와 `onConfirm`을 전달합니다.

## Migration Structure

- `src/app`: Next.js App Router 진입점과 전역 스타일
- `src/screens`: 기존 Vite 화면 컴포넌트
- `src/components/ui`: shadcn/ui 컴포넌트
- `src/stores`: Zustand 상태
- `src/lib/realtime`: WebSocket 및 WebRTC 공통 진입점

현재는 기존 React Router 화면을 optional catch-all App Router 경로에서 실행합니다. 기능 개발 시 화면별로 `src/app` 라우트와 Server/Client Component로 점진 전환합니다.

## Validation

```bash
npm run lint
npm run type-check
npm run build
npm run start
```

ESLint는 문장 끝 세미콜론을 허용하지 않습니다.
