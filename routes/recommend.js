import express from "express";
import { GoogleGenAI } from "@google/genai";
import { findStopovers } from "./stopovers.js";

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const WANT = 3; // 화면에 보낼 추천 개수
const ATTEMPTS = 2; // 검증 통과가 모자라면 AI에게 다시 요청하는 최대 횟수

const KAKAO_KEY = () => process.env.KAKAO_REST_API_KEY || process.env.KAKAO_REST_KEY;

const LABEL = {
  availableTime: {
    under_1h: "30분~1시간",
    "1_2h": "1~2시간",
    "2_4h": "2~4시간",
    over_4h: "4시간 이상(하루종일)",
  },
  budget: {
    free: "무료", "10k_under": "1만원 이하", "30k_under": "3만원 이하", "50k_over": "5만원 이상",
    "50k_under": "5만원 이하", "100k_under": "10만원 이하", "150k_under": "15만원 이하", "200k_over": "20만원 이상",
  },
  transport: {
    walk: "도보", public: "대중교통", taxi: "택시", car: "자가용", train: "기차", airplane: "비행기",
  },
  companion: { solo: "혼자", friend: "친구와", couple: "연인과", family: "가족과" },
  condition: { fresh: "상쾌함(에너지 넘침)", normal: "보통", tired: "피곤함(여유롭게)", rest: "휴식 필요(최소 이동)" },
  travelStyle: { sightseeing: "명소/관광", activity: "체험/액티비티", healing: "휴식/힐링", food: "식도락/맛집" },
};

// 일상: 왕복 이동이 전체 시간의 1/3 이하가 되도록 편도 상한 설정
const DAILY_BUDGET = {
  under_1h: { total: 45, oneWay: 8 },
  "1_2h": { total: 90, oneWay: 15 },
  "2_4h": { total: 180, oneWay: 30 },
  over_4h: { total: 300, oneWay: 50 },
};

// 여행: 기간별 편도 이동 시간 범위(분)와 추천할 활동 개수
const TRAVEL_PLAN = {
  day: { label: "당일치기", days: 1, minOneWay: 60, oneWay: 150, activities: "2~3개" },
  "1n2d": { label: "1박 2일", days: 2, minOneWay: 90, oneWay: 240, activities: "3~4개" },
  "2n3d": { label: "2박 3일", days: 3, minOneWay: 120, oneWay: 300, activities: "4~5개" },
  "3n_over": { label: "3박 4일 이상", days: 4, minOneWay: 150, oneWay: 360, activities: "5~6개" },
};

// 이동수단별 대략적인 속도(m/분). 직선거리 기준으로 쓰려고 아래에서 1.3으로 나눔
const SPEED_M_PER_MIN = { walk: 75, public: 350, taxi: 450, car: 450 };

/* ---------------- 카카오 로컬 API ---------------- */

async function kakaoGet(kind, params) {
  const url = `https://dapi.kakao.com/v2/local/search/${kind}.json?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY()}` },
  });
  if (!res.ok) throw new Error(`kakao ${kind} ${res.status}`);
  const data = await res.json();
  return data.documents ?? [];
}

// 출발지 문자열 → 좌표 (FlowStep에서 lat/lng가 안 넘어온 경우 서버에서 직접 변환)
async function resolveOrigin(c) {
  if (c.lat && c.lng) return { lat: Number(c.lat), lng: Number(c.lng) };
  try {
    let docs = await kakaoGet("address", { query: c.location, size: "1" });
    if (!docs.length) docs = await kakaoGet("keyword", { query: c.location, size: "1" });
    if (docs[0]) return { lat: Number(docs[0].y), lng: Number(docs[0].x) };
  } catch (e) {
    console.error("[origin]", e.message);
  }
  return null;
}

function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const norm = (s = "") => s.replace(/\s|\(.*?\)/g, "").toLowerCase();
const matches = (docName, cand) => {
  const a = norm(docName);
  const b = norm(cand);
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
};
const shortRegion = (address = "") => address.split(" ").slice(0, 2).join(" ");

// 일상: 이동 반경 안에서 실제로 검색되는 장소만 통과
async function verifyDaily(r, origin, radius) {
  const params = { query: r.place, size: "5" };
  if (origin) Object.assign(params, { x: origin.lng, y: origin.lat, radius, sort: "distance" });
  const docs = await kakaoGet("keyword", params);
  const hit = docs.find((d) => matches(d.place_name, r.place));
  if (!hit) return null;
  return {
    ...r,
    place: hit.place_name,
    region: shortRegion(hit.address_name) || r.region,
    address: hit.road_address_name || hit.address_name,
    lat: Number(hit.y),
    lng: Number(hit.x),
    placeUrl: hit.place_url,
    stopovers: [],
  };
}

// 여행: 지역이 실제로 존재하고, 출발지에서 충분히 떨어져 있는지 확인
async function verifyTravel(r, origin, plan, originProvinceName) {
  const core = r.place.replace(/(특별시|광역시|시|군)$/, "");
  const docs = await kakaoGet("keyword", { query: r.place, size: "5" });
  const hit = docs.find((d) => d.address_name?.includes(core) || matches(d.place_name, r.place));
  if (!hit) return null;

  const dest = { lat: Number(hit.y), lng: Number(hit.x) };
  if (origin) {
    if (distanceKm(origin, dest) < plan.minOneWay * 0.5) return null; // 너무 가까움
  } else if (originProvinceName && String(hit.address_name).includes(originProvinceName)) {
    return null; // 좌표를 못 구했을 때는 같은 시·도만 제외
  }

  return {
    ...r,
    region: shortRegion(hit.address_name) || r.region,
    address: hit.road_address_name || hit.address_name,
    lat: dest.lat,
    lng: dest.lng,
    placeUrl: hit.place_url,
    stopovers: [],
  };
}

/* ---------------- 경유지 (stopovers.js 연결) ---------------- */

// 후보 중 경로의 1/3, 2/3 지점에 가까운 2곳을 고름
function chooseStopovers(results) {
  const inner = results.filter((s) => s.progress > 0.1 && s.progress < 0.9);
  const pool = inner.length ? inner : results;
  const picked = [];
  for (const target of [0.33, 0.66]) {
    const rest = pool.filter((s) => !picked.includes(s));
    if (!rest.length) break;
    picked.push(
      rest.reduce((best, s) =>
        Math.abs(s.progress - target) < Math.abs(best.progress - target) ? s : best
      )
    );
  }
  return picked.sort((a, b) => a.progress - b.progress);
}

async function attachStopovers(r, origin, conditions) {
  if (!conditions.includeStopovers || conditions.transport === "airplane" || !origin) {
    return { ...r, stopovers: [] };
  }
  try {
    const found = await findStopovers(
      { x: origin.lng, y: origin.lat },
      { x: r.lng, y: r.lat },
      {
        transport: conditions.transport,
        travelStyle: conditions.travelStyle,
        includeStopovers: true,
      }
    );
    if (!found || found.tooFar || found.results.length === 0) return { ...r, stopovers: [] };
    const picked = chooseStopovers(found.results);
    return {
      ...r,
      stopovers: picked.map((s) => s.name), // 티켓 경로 표시용
      stopoverPlaces: picked, // 나중에 링크/좌표가 필요할 때 쓰는 상세 정보
    };
  } catch (e) {
    console.error("[stopovers]", e.message);
    return { ...r, stopovers: [] };
  }
}

/* ---------------- 프롬프트 ---------------- */

// "인천광역시 미추홀구 ..." → "인천" / "강원특별자치도 ..." → "강원"
function originProvince(location = "") {
  const first = location.trim().split(/\s+/)[0] ?? "";
  return first.replace(/(특별자치시|특별자치도|특별시|광역시|도)$/, "");
}

function describeConditions(c) {
  const where = c.lat && c.lng ? `${c.location} (위도 ${c.lat}, 경도 ${c.lng})` : c.location;
  const common = `동행: ${LABEL.companion[c.companion]}
이동수단: ${LABEL.transport[c.transport]}`;

  if (c.type === "travel") {
    const p = TRAVEL_PLAN[c.travelDuration] ?? TRAVEL_PLAN.day;
    return `유형: 여행 (여행지도 네가 직접 추천해야 함)
출발지: ${where}
여행 기간: ${p.label}
이동 규칙: 출발지에서 편도 최소 ${p.minOneWay}분, 최대 ${p.oneWay}분 걸리는 여행지만 추천
금지: 출발지와 같은 시·도(${originProvince(c.location) || "출발지 지역"})에 있는 여행지는 추천하지 마
여행 스타일: ${LABEL.travelStyle[c.travelStyle]}
${common}
예산: ${LABEL.budget[c.budget]} (하루 기준)`;
  }

  const t = DAILY_BUDGET[c.availableTime] ?? DAILY_BUDGET["1_2h"];
  return `유형: 일상(오늘 하루)
현재 위치: ${where}
소요 가능 시간: ${LABEL.availableTime[c.availableTime]} (전체 약 ${t.total}분)
이동 규칙: 현재 위치에서 편도 ${t.oneWay}분 이내 (${LABEL.transport[c.transport]} 기준)
현장에서 즐길 시간: 최소 ${t.total - t.oneWay * 2}분 확보
현재 컨디션: ${LABEL.condition[c.condition]}
${common}
예산: ${LABEL.budget[c.budget]}`;
}

function buildPrompt({ tasteProfile, conditions, tried, plan }) {
  const isTravel = conditions.type === "travel";

  const placeRule = isTravel
    ? `place는 여행지 이름(시·군 단위, 예: 강릉, 통영), activities는 그 여행지에서 할 수 있는 활동의 '종류' ${plan.activities}(예: 해변 산책, 시장 먹거리 투어. 가게나 시설 이름은 쓰지 마)${
        plan.days > 1 ? ', 각 항목 앞에 "1일차 · ", "2일차 · "처럼 날짜를 붙여' : ""
      }`
    : "place는 카카오맵에서 검색되는 정확한 장소 이름(상호명 그대로), activities는 그 장소에서 할 수 있는 활동 1~2개(메뉴나 상품 이름은 쓰지 마)";

  const timeRule = isTravel
    ? `travelTime은 "편도 2시간"처럼, stayTime은 현지 체류 기간("${plan.label}" 형식)으로`
    : `travelTime은 "편도 15분"처럼, stayTime은 "약 1시간 30분"처럼 짧게`;

  return `
너는 취향 기반 추천 서비스 '오늘 뭐할까?'의 추천 엔진이야.
아래 정보를 바탕으로 추천 후보 6가지를 만들어줘.

[사용자 취향] ${JSON.stringify(tasteProfile)}
[선택 조건]
${describeConditions(conditions)}

규칙:
- 실제로 존재하고 네가 확실히 아는 장소만 추천해. 조금이라도 불확실하면 빼고, 이름을 지어내거나 비슷하게 만들지 마
- 위 '이동 규칙'의 이동 시간 범위를 반드시 지켜
${isTravel ? "- 후보는 가능한 한 서로 다른 시·도(권역)에서 골라서 다양하게 제안해" : ""}
- 동행, 예산, 이동수단, 취향을 반드시 반영해
- ${placeRule}
- 이동수단이 비행기면 국내선 공항이 있는 도시만, 기차면 기차역이 있는 도시만 추천해
- title은 그 추천을 한 줄로 소개하는 짧은 문구
- region은 반드시 시·도를 포함해서 "강원 강릉시"처럼, cost는 ${
    isTravel ? '"약 20만원"처럼 총 예상 경비를' : '"약 3만원"처럼'
  } 짧게
- ${timeRule}
- stopovers는 서버가 따로 채우니까 항상 빈 배열([])로 둬
- reason은 이 취향/조건에 맞는 이유를 한 문장으로
- 이미 보여줬거나 제외된 장소: ${tried.length ? tried.join(", ") : "없음"}
`;
}

async function generate(prompt) {
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
            activities: { type: "ARRAY", items: { type: "STRING" } },
            stopovers: { type: "ARRAY", items: { type: "STRING" } },
            reason: { type: "STRING" },
          },
          required: [
            "title", "place", "region", "travelTime", "stayTime",
            "cost", "activities", "stopovers", "reason",
          ],
        },
      },
    },
  });
  return JSON.parse(response.text);
}

/* ---------------- 라우트 ---------------- */

router.post("/", async (req, res) => {
  const { tasteProfile, conditions, exclude = [] } = req.body;
  if (!conditions) return res.status(400).json({ message: "조건이 없어요" });

  const isTravel = conditions.type === "travel";
  const plan = isTravel ? TRAVEL_PLAN[conditions.travelDuration] ?? TRAVEL_PLAN.day : null;
  const canVerify = Boolean(KAKAO_KEY());

  try {
    // 카카오 키가 없으면 검증 없이 AI 결과만 보냄 (개발용)
    if (!canVerify) {
      console.warn("[recommend] 카카오 REST 키가 없어 장소 검증을 건너뜁니다");
      const raw = await generate(buildPrompt({ tasteProfile, conditions, tried: exclude, plan }));
      return res.json(raw.slice(0, WANT));
    }

    const origin = await resolveOrigin(conditions);
    const radius = !isTravel
      ? Math.min(
          20000,
          Math.round(
            ((DAILY_BUDGET[conditions.availableTime] ?? DAILY_BUDGET["1_2h"]).oneWay *
              (SPEED_M_PER_MIN[conditions.transport] ?? 350)) / 1.3
          )
        )
      : 0;
    const originProvinceName = originProvince(conditions.location);

    const verified = [];
    const tried = [...exclude];

    for (let i = 0; i < ATTEMPTS && verified.length < WANT; i++) {
      const candidates = await generate(buildPrompt({ tasteProfile, conditions, tried, plan }));

      const checked = await Promise.all(
        candidates.map((r) =>
          (isTravel
            ? verifyTravel(r, origin, plan, originProvinceName)
            : verifyDaily(r, origin, radius)
          ).catch((e) => {
            console.error("[verify]", r.place, e.message);
            return null;
          })
        )
      );

      const passed = checked.filter(Boolean);
      console.log(`[recommend] ${i + 1}차: 후보 ${candidates.length}개 중 검증 통과 ${passed.length}개`);

      for (const v of passed) {
        if (!verified.some((x) => x.place === v.place)) verified.push(v);
      }
      tried.push(...candidates.map((r) => r.place));
    }

    if (verified.length === 0) {
      return res.status(502).json({ message: "조건에 맞는 실제 장소를 찾지 못했어요" });
    }

    let final = verified.slice(0, WANT);

    // 여행 + 경유지 체크: 최종 결과에만 실제 경유지를 붙임
    if (isTravel && conditions.includeStopovers) {
      final = await Promise.all(final.map((r) => attachStopovers(r, origin, conditions)));
      console.log(
        `[recommend] 경유지: ${final.map((r) => `${r.place}(${r.stopovers.length})`).join(", ")}`
      );
    }

    res.json(final);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "추천 생성에 실패했어요" });
  }
});

export default router;