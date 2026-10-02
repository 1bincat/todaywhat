const API = "http://localhost:4000/api/taste";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// 로그인 상태일 때만 서버에 저장
export async function saveTaste(answers) {
  if (!localStorage.getItem("token")) return;
  try {
    await fetch(API, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ answers }),
    });
  } catch (e) {
    console.error(e);
  }
}

export async function loadTaste() {
  try {
    const res = await fetch(API, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.answers;
  } catch {
    return null;
  }
}