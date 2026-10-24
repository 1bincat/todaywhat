import express from "express";

const router = express.Router();

const KAKAO_LOCAL = "https://dapi.kakao.com/v2/local/search";
const KAKAO_KEY = () => process.env.KAKAO_REST_API_KEY || process.env.KAKAO_REST_KEY;

const TRANSPORT_CONFIG = {
  walk: { radius: 700, maxPoints: 3, stepKm: 1, maxDistanceKm: 10 },
  public: { radius: 2500, maxPoints: 4, stepKm: 15, maxDistanceKm: Infinity },
  car: { radius: 5000, maxPoints: 5, stepKm: 20, maxDistanceKm: Infinity },
};

// 새 이동수단은 비슷한 설정으로 연결 (airplane은 경유지 없음)
const TRANSPORT_ALIAS = { taxi: "car", train: "public" };

const STYLE_QUERIES = {
  sightseeing: [{ query: "관광명소", category: "AT4" }],
  activity: [{ query: "체험" }, { query: "액티비티" }],
  healing: [{ query: "공원" }, { query: "카페", category: "CE7" }],
  food: [{ query: "맛집", category: "FD6" }],
};

const MAX_RESULTS = 5;
const DEST_RADIUS = 3000;
const PAGES = [1, 2]; // 지점마다 2페이지(최대 30개)씩 가져옴

// 경유지로 부적절한 곳 (고속도로 휴게소 등)
const NOISE = /휴게소|졸음쉼터|주차장|톨게이트|요금소|고속도로/;
const MIN_GOOD = 2; // 괜찮은 장소가 이보다 적을 때만 휴게소로 보충

async function kakaoGet(path, params) {
  const url = `${KAKAO_LOCAL}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY()}` },
  });
  if (!res.ok) throw new Error(`Kakao API ${res.status}`);
  return res.json();
}

async function geocode(text) {
  const byKeyword = await kakaoGet("keyword.json", { query: text, size: 1 });
  if (byKeyword.documents[0]) {
    const d = byKeyword.documents[0];
    return { name: d.place_name, x: Number(d.x), y: Number(d.y) };
  }
  const byAddress = await kakaoGet("address.json", { query: text, size: 1 });
  if (byAddress.documents[0]) {
    const d = byAddress.documents[0];
    return { name: d.address_name, x: Number(d.x), y: Number(d.y) };
  }
  return null;
}

function haversine(a, b) {
  const R = 6371000;
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.y - a.y);
  const dLng = rad(b.x - a.x);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.y)) * Math.cos(rad(b.y)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function offRoute(a, b, p) {
  const k = Math.cos((a.y * Math.PI) / 180);
  const toM = (pt) => ({ x: (pt.x - a.x) * 111320 * k, y: (pt.y - a.y) * 110540 });
  const B = toM(b);
  const P = toM(p);
  const len2 = B.x ** 2 + B.y ** 2 || 1;
  const t = Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / len2));
  return {
    distance: Math.hypot(P.x - t * B.x, P.y - t * B.y),
    progress: t,
  };
}

function makeBasePoints(a, b, count) {
  return Array.from({ length: count }, (_, i) => {
    const f = (i + 1) / (count + 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  });
}

/**
 * 출발지~도착지 경로 위의 실제 장소를 찾음
 * origin, dest: { x: 경도, y: 위도 }
 * 반환: null(지원 안 하는 조건) | { tooFar: true } | { results, radius, distanceKm }
 */
export async function findStopovers(
  origin,
  dest,
  { transport = "public", travelStyle = "sightseeing", includeStopovers = true } = {}
) {
  const config = TRANSPORT_CONFIG[TRANSPORT_ALIAS[transport] ?? transport];
  const queries = STYLE_QUERIES[travelStyle];
  if (!config || !queries) return null;

  const distanceKm = haversine(origin, dest) / 1000;
  if (distanceKm > config.maxDistanceKm) return { tooFar: true, distanceKm };

  const radius = includeStopovers ? config.radius : DEST_RADIUS;
  const count = Math.max(1, Math.min(config.maxPoints, Math.round(distanceKm / config.stepKm)));
  const basePoints = includeStopovers
    ? makeBasePoints(origin, dest, count)
    : [{ x: dest.x, y: dest.y }];

  const responses = await Promise.all(
    basePoints.flatMap((pt) =>
      queries.flatMap((q) =>
        PAGES.map((page) =>
          kakaoGet("keyword.json", {
            query: q.query,
            x: pt.x,
            y: pt.y,
            radius,
            sort: "distance",
            size: 15,
            page,
            ...(q.category ? { category_group_code: q.category } : {}),
          })
        )
      )
    )
  );

  const seen = new Map();
  for (const r of responses) {
    for (const d of r.documents) {
      if (seen.has(d.id)) continue;
      const p = { x: Number(d.x), y: Number(d.y) };
      const { distance, progress } = includeStopovers
        ? offRoute(origin, dest, p)
        : { distance: haversine(dest, p), progress: 1 };
      if (distance > radius) continue;
      seen.set(d.id, {
        id: d.id,
        name: d.place_name,
        category: d.category_name,
        address: d.road_address_name || d.address_name,
        x: p.x,
        y: p.y,
        url: d.place_url,
        ...(includeStopovers
          ? { offRouteM: Math.round(distance) }
          : { distanceFromDestM: Math.round(distance) }),
        progress: Number(progress.toFixed(3)),
        score: 1 - distance / radius,
      });
    }
  }

  // 휴게소 등은 뒤로 빼고, 괜찮은 장소를 우선 선택
  const all = [...seen.values()];
  const good = all.filter((p) => !NOISE.test(p.category ?? ""));
  const noise = all.filter((p) => NOISE.test(p.category ?? ""));
  const byScore = (a, b) => b.score - a.score;

  let ranked = good.sort(byScore).slice(0, MAX_RESULTS);
  if (ranked.length < MIN_GOOD) {
    ranked = [...ranked, ...noise.sort(byScore).slice(0, MAX_RESULTS - ranked.length)];
  }
  if (includeStopovers) ranked.sort((a, b) => a.progress - b.progress);

  console.log(
    `[stopovers] 후보 ${all.length}개 (휴게소 등 제외 ${noise.length}개) →`,
    ranked.map((r) => `${r.name}[${(r.category ?? "").split(" > ").slice(-1)[0]}]`).join(", ")
  );

  return {
    results: ranked.map(({ score, ...rest }) => rest),
    radius,
    distanceKm,
  };
}

/* ---------------- 기존 라우트 (도착지를 직접 입력하는 방식) ---------------- */

router.post("/", async (req, res) => {
  const { location, destination, transport = "public", travelStyle = "sightseeing" } = req.body;

  if (!location?.trim() || !destination?.trim()) {
    return res.status(400).json({ message: "출발지와 도착지를 입력해 주세요." });
  }
  const includeStopovers = req.body.includeStopovers !== false;

  try {
    const [origin, dest] = await Promise.all([geocode(location), geocode(destination)]);
    if (!origin || !dest) {
      return res.status(404).json({ message: "출발지나 도착지를 찾을 수 없어요." });
    }

    const found = await findStopovers(origin, dest, { transport, travelStyle, includeStopovers });
    if (!found) return res.status(400).json({ message: "잘못된 요청이에요." });
    if (found.tooFar) {
      return res
        .status(400)
        .json({ message: "도보로 가기엔 너무 멀어요. 다른 이동 수단을 선택해 주세요." });
    }

    res.json({
      origin,
      destination: dest,
      distanceKm: Number(found.distanceKm.toFixed(1)),
      transport,
      radiusM: found.radius,
      includeStopovers,
      ...(includeStopovers ? { stopovers: found.results } : { places: found.results }),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;