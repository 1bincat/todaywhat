import express from "express";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const LABEL = {
  availableTime: { under_1h: "30분~1시간", "1_2h": "1~2시간", "3_4h": "3~4시간", over_5h: "5시간 이상" },
  budget: {
    free: "무료", "10k_under": "1만원 이하", "30k_under": "3만원 이하", "50k_over": "5만원 이상",
    "50k_under": "5만원 이하", "100k_under": "10만원 이하", "150k_under": "15만원 이하", "200k_over": "20만원 이상",
  },
  transport: { walk: "도보", public: "대중교통", car: "자가용/택시" },
  condition: { fresh: "상쾌함(에너지 넘침)", normal: "보통", tired: "피곤함(여유롭게)", rest: "휴식 필요(최소 이동)" },
  travelStyle: { sightseeing: "명소/관광", activity: "체험/액티비티", healing: "휴식/힐링", food: "식도락/맛집" },
};

// 여유 시간별 전체 분 / 편도 이동 상한 (왕복 이동이 전체의 1/3 이하가 되도록)
const TIME_BUDGET = {
  under_1h: { total: 45, oneWay: 8 },
  "1_2h": { total: 90, oneWay: 15 },
  "3_4h": { total: 210, oneWay: 35 },
  over_5h: { total: 300, oneWay: 50 },
};

function describeConditions(c) {
  const common = `예산: ${LABEL.budget[c.budget]}, 이동수단: ${LABEL.transport[c.transport]}`;

  if (c.type === "travel") {
    return `유형: 여행
출발지: ${c.location}, 도착지: ${c.destination}
여행 스타일: ${LABEL.travelStyle[c.travelStyle]}
${common} (예산은 하루 기준)
경유지 추천: ${c.includeStopovers ? "포함" : "제외"}`;
  }

  const t = TIME_BUDGET[c.availableTime] ?? TIME_BUDGET["1_2h"];
  return `유형: 일상(오늘 하루)
현재 위치: ${c.location}
여유 시간: ${LABEL.availableTime[c.availableTime]} (전체 약 ${t.total}분)
이동 규칙: 현재 위치에서 편도 ${t.oneWay}분 이내 (${LABEL.transport[c.transport]} 기준)
현장에서 즐길 시간: 최소 ${t.total - t.oneWay * 2}분 확보
현재 컨디션: ${LABEL.condition[c.condition]}
${common}`;
}

router.post("/", async (req, res) => {
  const { tasteProfile, conditions, exclude = [] } = req.body;
  if (!conditions) return res.status(400).json({ message: "조건이 없어요" });

  const prompt = `
너는 취향 기반 추천 서비스 '오늘 뭐할까?'의 추천 엔진이야.
아래 정보를 바탕으로 추천 3가지를 만들어줘.

[사용자 취향] ${JSON.stringify(tasteProfile)}
[선택 조건]
${describeConditions(conditions)}

규칙:
- 실제로 존재하는 장소만 추천하고, 확실하지 않으면 추천하지 마
- 편도 이동시간이 위 '이동 규칙'을 넘는 장소는 절대 추천하지 마
- 여유 시간/예산/이동수단/컨디션을 반드시 지켜
- place는 장소 이름만, title은 그 장소를 한 줄로 소개하는 짧은 문구
- region은 시·구 단위, cost는 "약 1만원"처럼 짧게
- travelTime은 "편도 15분"처럼, stayTime은 "약 1시간 30분"처럼 짧게
- companion은 취향에 맞는 동행 형태("혼자", "친구와" 등)
- stopovers는 경유지 추천이 '포함'일 때만 가는 길에 들를 장소 1~2개 이름, 아니면 빈 배열
- reason은 이 취향/조건에 맞는 이유를 한 문장으로
- 이미 보여준 장소는 제외: ${exclude.length ? exclude.join(", ") : "없음"}
`;

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              place: { type: "STRING" },
              region: { type: "STRING" },
              travelTime: { type: "STRING" },
              stayTime: { type: "STRING" },
              cost: { type: "STRING" },
              companion: { type: "STRING" },
              stopovers: { type: "ARRAY", items: { type: "STRING" } },
              reason: { type: "STRING" },
            },
            required: [
              "title", "place", "region", "travelTime", "stayTime",
              "cost", "companion", "stopovers", "reason",
            ],
          },
        },
      },
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "추천 생성에 실패했어요" });
  }
});

export default router;