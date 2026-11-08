import { API_BASE } from "../config.js";
const API = `${API_BASE}/api/around`;

export async function fetchAround({ lat, lng, category, radius, sort }) {
  const q = new URLSearchParams({ lat, lng, category, radius, sort });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error("주변 검색 실패");
  return res.json();
}