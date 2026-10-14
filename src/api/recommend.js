const API = "http://localhost:4000/api/recommend";

export async function fetchRecommend(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("추천 실패");
  return res.json();
}