import express from "express";
 
const router = express.Router();
 
const KAKAO_LOCAL = "https://dapi.kakao.com/v2/local/search";
 
const TRANSPORT_CONFIG = {
  walk: { radius: 700, maxPoints: 3, stepKm: 1, maxDistanceKm: 10 },
  public: { radius: 2500, maxPoints: 4, stepKm: 15, maxDistanceKm: Infinity },
  car: { radius: 5000, maxPoints: 5, stepKm: 20, maxDistanceKm: Infinity },
};
 
const STYLE_QUERIES = {
  sightseeing: [{ query: "관광명소", category: "AT4" }],
  activity: [{ query: "체험" }, { query: "액티비티" }],
  healing: [{ query: "공원" }, { query: "카페", category: "CE7" }],
  food: [{ query: "맛집", category: "FD6" }],
};
 
const MAX_RESULTS = 5;
const DEST_RADIUS = 3000;
 
async function kakaoGet(path, params) {
  const url = `${KAKAO_LOCAL}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
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
 
router.post("/", async (req, res) => {
  const { location, destination, transport = "public", travelStyle = "sightseeing" } = req.body;
 
  if (!location?.trim() || !destination?.trim()) {
    return res.status(400).json({ message: "출발지와 도착지를 입력해 주세요." });
  }
  const includeStopovers = req.body.includeStopovers !== false;
  const config = TRANSPORT_CONFIG[transport];
  const queries = STYLE_QUERIES[travelStyle];
  if (!config || !queries) {
    return res.status(400).json({ message: "잘못된 요청이에요." });
  }
 
  try {
    const [origin, dest] = await Promise.all([geocode(location), geocode(destination)]);
    if (!origin || !dest) {
      return res.status(404).json({ message: "출발지나 도착지를 찾을 수 없어요." });
    }
 
    const distanceKm = haversine(origin, dest) / 1000;
    if (distanceKm > config.maxDistanceKm) {
      return res.status(400).json({ message: "도보로 가기엔 너무 멀어요. 다른 이동 수단을 선택해 주세요." });
    }
 
    const radius = includeStopovers ? config.radius : DEST_RADIUS;
    const count = Math.max(1, Math.min(config.maxPoints, Math.round(distanceKm / config.stepKm)));
    const basePoints = includeStopovers
      ? makeBasePoints(origin, dest, count)
      : [{ x: dest.x, y: dest.y }];
 
    const responses = await Promise.all(
      basePoints.flatMap((pt) =>
        queries.map((q) =>
          kakaoGet("keyword.json", {
            query: q.query,
            x: pt.x,
            y: pt.y,
            radius,
            sort: "distance",
            size: 15,
            ...(q.category ? { category_group_code: q.category } : {}),
          })
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
 
    const ranked = [...seen.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
    if (includeStopovers) ranked.sort((a, b) => a.progress - b.progress);
    const results = ranked.map(({ score, ...rest }) => rest);
 
    res.json({
      origin,
      destination: dest,
      distanceKm: Number(distanceKm.toFixed(1)),
      transport,
      radiusM: radius,
      includeStopovers,

      ...(includeStopovers ? { stopovers: results } : { places: results }),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});
 
export default router;