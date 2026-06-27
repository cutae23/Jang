// api/gemini.js
//
// Vercel 서버리스 함수입니다. 이 함수만 GEMINI_API_KEY(공용 키)에 접근할 수 있고,
// 그 값은 절대 브라우저로 전달되지 않습니다.
//
// 설정 방법:
//   Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
//   Name:  GEMINI_API_KEY
//   Value: (Google AI Studio에서 발급받은 키)
//   Environment: Production / Preview / Development 모두 체크 권장
//   저장 후 재배포(Redeploy) 해야 적용됩니다.
//
// 공용 키가 설정되어 있지 않으면 503을 반환하고, 클라이언트(index.html)는
// 자동으로 사용자가 입력한 개인 키 → 로컬 AI 순으로 폴백합니다.

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

module.exports = async function handler(req, res) {
  // 다른 도메인에서 이 프런트엔드를 띄워도 동작하도록 CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // 공용 키는 여기(서버)에서만 읽힙니다. 브라우저로는 절대 보내지 않습니다.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 공용 키가 설정되지 않음 → 클라이언트가 개인 키/로컬 AI로 폴백하도록 신호
    return res.status(503).json({ error: 'no_shared_key' });
  }

  const prompt = req.body && req.body.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'invalid_prompt' });
  }

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(502).json({ error: 'gemini_error', detail: data });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
};
