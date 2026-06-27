# 장기 AI 대전 - Gemini 연동 (Vercel 배포 가이드)

## 폴더 구조
```
.
├── index.html        ← 게임 화면 (정적 파일)
├── api/
│   └── gemini.js      ← 공용 Gemini 키를 서버에서만 쓰는 서버리스 함수
└── package.json
```

## 동작 방식 (보안 구조)
1. **공용 키 (1순위)** — `api/gemini.js`가 Vercel 환경변수 `GEMINI_API_KEY`를 서버에서만 읽어 Google에 요청합니다. 이 키는 절대 브라우저로 전송되지 않으므로 페이지 소스나 네트워크 탭에서 볼 수 없습니다.
2. **개인 키 (2순위, 폴백)** — 공용 키가 설정되어 있지 않거나(`api/gemini`가 503 반환) 호출 자체가 실패하면(예: Vercel에 배포하지 않고 그냥 파일만 연 경우), 사용자가 배치 화면에 직접 입력한 개인 키로 브라우저에서 Gemini를 직접 호출합니다. 이 키는 저장되지 않고 새로고침하면 사라집니다.
3. **로컬 AI (3순위)** — 위 두 가지가 모두 없거나 실패하면 내장된 미니맥스 AI가 둡니다.

즉, 공용 키를 제대로 설정해두면 사용자는 아무 키도 입력하지 않아도 Gemini로 플레이할 수 있고, 그 키는 코드 어디에도 노출되지 않습니다.

## 배포 방법

### 1) GitHub로 배포 (가장 쉬움)
1. 이 폴더를 GitHub 저장소에 올립니다.
2. [vercel.com](https://vercel.com) → New Project → 해당 저장소 Import (별도 빌드 설정 필요 없음, Other/정적 프로젝트로 자동 인식됩니다).
3. 배포가 끝나면 아래 2)번 단계로 환경변수를 등록합니다.

### 2) Vercel CLI로 배포
```bash
npm install -g vercel
cd 이폴더
vercel        # 처음 배포 (질문에 기본값으로 답해도 됩니다)
vercel --prod # 운영 배포
```

### 3) 환경변수(공용 키) 등록 — 가장 중요한 단계
1. Vercel 대시보드 → 해당 프로젝트 → **Settings → Environment Variables**
2. **Name**: `GEMINI_API_KEY`
3. **Value**: Google AI Studio(https://aistudio.google.com/apikey)에서 발급받은 키
4. **Environment**: Production, Preview, Development 모두 체크 (로컬 테스트도 하려면 Development 포함)
5. **Save** 후, 반드시 **Redeploy** 해야 적용됩니다. (이미 있던 배포에는 자동 적용되지 않습니다.)

### 4) 로컬에서 테스트
```bash
vercel link          # 프로젝트 연결 (최초 1회)
vercel env pull .env.local   # 방금 등록한 환경변수를 로컬로 가져오기
vercel dev            # http://localhost:3000 에서 실행 (api 라우트 포함 전체 동작 확인 가능)
```
`index.html`을 그냥 더블클릭해서 열면(`file://`) `/api/gemini` 라우트가 없으므로 공용 키 단계는 자동으로 건너뛰고 개인 키 → 로컬 AI로 진행됩니다.

## 키 노출에 대한 솔직한 설명
- **공용 키**: `process.env.GEMINI_API_KEY`는 서버리스 함수 안에서만 존재합니다. 브라우저로 내려가는 응답에는 키 값이 전혀 포함되지 않으므로, 이 경로로는 키가 유출되지 않습니다.
- **개인 키(폴백)**: 사용자가 직접 입력해 브라우저에서 Google로 바로 요청을 보내는 방식이라, 네트워크 요청 안에 키가 그대로 들어갑니다. 본인만 쓰는 용도로는 괜찮지만, 여러 사람이 쓰는 서비스로 공개 배포할 거라면 이 폴백 경로는 끄거나(체크박스 자체를 숨기거나) 안내 문구로 주의를 주는 걸 추천합니다.
- 공용 키를 발급받을 때 Google AI Studio / Google Cloud Console에서 **API 키에 도메인 제한(HTTP referrer restriction)을 걸어두면** 혹시 어딘가로 유출되더라도 다른 도메인에서는 못 쓰게 막을 수 있어 한 겹 더 안전합니다.
