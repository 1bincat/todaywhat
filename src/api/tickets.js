import { API_BASE as BASE } from "../config.js";
const API = `${BASE}/api/tickets`;

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "요청에 실패했어요.");
  return data;
}

export const photoSrc = (path) => (path ? `${BASE}${path}` : null);

export const saveTicket = (ticket, conditions) =>
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ ticket, conditions }),
  }).then(handle);

export const fetchTickets = (limit) =>
  fetch(`${API}${limit ? `?limit=${limit}` : ""}`, { headers: authHeader() }).then(handle);

export const fetchTicket = (id) => fetch(`${API}/${id}`, { headers: authHeader() }).then(handle);

export const deleteTicket = (id) =>
  fetch(`${API}/${id}`, { method: "DELETE", headers: authHeader() }).then(handle);

// 별점/후기/방문일/사진 (사진은 파일 업로드라서 FormData로 보냄)
export function saveJourney(id, { rating, review, visitedAt, photo, removePhoto }) {
  const fd = new FormData();
  fd.append("rating", rating ? String(rating) : "");
  fd.append("review", review ?? "");
  fd.append("visited_at", visitedAt ?? "");
  if (photo) fd.append("photo", photo);
  if (removePhoto) fd.append("removePhoto", "true");
  return fetch(`${API}/${id}/journey`, {
    method: "PUT",
    headers: authHeader(), // Content-Type은 브라우저가 알아서 설정
    body: fd,
  }).then(handle);
}