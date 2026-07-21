# Plamingo Frontend

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
import { globalModal } from '@/shared/model'

globalModal.open({
    title: '저장 완료',
    description: '여행 정보가 저장되었습니다.',
})
```

확인과 취소가 모두 필요한 경우 `showCancel: true`와 `onConfirm`을 전달합니다.

## FSD Architecture

Next.js App Router와 FSD의 `app`, `pages` 명칭 충돌을 피하기 위해 라우팅은 `src/app`, FSD 페이지 레이어는 `src/views`를 사용합니다.

```text
src/
├─ app/       # Next.js 라우트, provider, 전역 초기화
├─ views/     # URL 단위 화면 조합
├─ widgets/   # 여러 기능과 엔티티를 조합한 독립 UI 블록
├─ features/  # 사용자 행동과 비즈니스 기능
├─ entities/  # 비즈니스 엔티티의 model과 UI
└─ shared/    # 범용 UI, 상태, 유틸리티, 실시간 통신
```

의존 방향은 `app → views → widgets → features → entities → shared`입니다. 상위 레이어는 하위 레이어만 import할 수 있으며, slice 외부에서는 각 폴더의 `index.ts` 공개 API를 사용합니다. ESLint가 상위 레이어 참조와 공개 API 우회 import를 검사합니다.

현재 기존 React Router 화면은 `src/app/_bootstrap/spa-app.tsx`에서 optional catch-all App Router 경로로 실행합니다. 화면을 Next.js 라우트로 전환할 때도 UI와 비즈니스 코드는 해당 FSD 레이어에 유지합니다.

참고: [NextJS에서 FSD 아키텍처 적용하기](https://velog.io/@byeongjun25/NextJS-NextJS%EC%97%90%EC%84%9C-FSD-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98-%EC%A0%81%EC%9A%A9%ED%95%98%EA%B8%B0)

## Validation

```bash
npm run lint
npm run type-check
npm run build
npm run start
```

ESLint는 문장 끝 세미콜론을 허용하지 않습니다.
