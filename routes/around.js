import express from "express";

const router = express.Router();
const KAKAO_KEY = () => process.env.KAKAO_REST_API_KEY || process.env.KAKAO_REST_KEY;

// 카카오 카테고리 그룹 코드: 관광명소 / 음식점 / 카페 / 문화시설 / 숙박
const ALLOWED = new Set(["AT4", "FD6", "CE7", "CT1", "AD5"]);

router.get("/", async (req, res) => {
  const { lat, lng, category = "AT4", radius = "5000", sort = "accuracy" } = req.query;

  if (!lat || !lng || !ALLOWED.has(category)) {
    return res.status(400).json({ message: "잘못된 요청이에요" });
  }
  if (!KAKAO_KEY()) {
    return res.status(500).json({ message: "카카오 키가 설정되지 않았어요" });
  }

  const params = new URLSearchParams({
    category_group_code: category,
    x: String(lng),
    y: String(lat),
    radius: String(Math.min(Number(radius) || 5000, 20000)),
    sort: sort === "distance" ? "distance" : "accuracy",
    size: "15",
  });

  try {
    const r = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${params}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY()}` },
    });
    if (!r.ok) throw new Error(`kakao ${r.status}`);
    const data = await r.json();

    res.json(
      (data.documents ?? []).map((d) => ({
        name: d.place_name,
        category: (d.category_name ?? "").split(" > ").slice(-1)[0],
        distance: d.distance ? Number(d.distance) : null,
        address: d.road_address_name || d.address_name,
        url: d.place_url,
        lat: Number(d.y),
        lng: Number(d.x),
      }))
    );
  } catch (err) {
    console.error("[around]", err.message);
    res.status(500).json({ message: "주변 장소를 불러오지 못했어요" });
  }
});

export default router;