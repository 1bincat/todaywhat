import { API_BASE } from "../config.js";
const API = `${API_BASE}/api/recommend`;

export async function fetchRecommend(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("추천 실패");
  return res.json();
}