// 서버 주소를 한 곳에서 관리해요. 웹과 앱에서 주소만 바꿔 쓸 수 있어요.
// .env 파일에 VITE_API_BASE=https://내서버주소 처럼 넣으면 그 주소를 써요. 끝에 /는 붙이지 않아요.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
