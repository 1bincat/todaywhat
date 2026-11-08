import { createContext, useContext, useEffect, useState } from "react";
import { saveTaste, loadTaste } from "../api/taste";

import { API_BASE } from "../config.js";
const API = `${API_BASE}/api/auth`;
const AuthContext = createContext(null);

// 비로그인 때 한 테스트가 있으면 계정에 저장, 없으면 계정의 결과를 불러옴
async function syncTaste() {
  const local = sessionStorage.getItem("tasteAnswers");
  if (local) {
    await saveTaste(JSON.parse(local));
    return;
  }
  const server = await loadTaste();
  if (server) sessionStorage.setItem("tasteAnswers", JSON.stringify(server));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  // 이미 로그인된 상태로 열었다면 취향 결과를 먼저 불러온 뒤 화면을 보여줌
  const [ready, setReady] = useState(!user);

  useEffect(() => {
    if (user) syncTaste().finally(() => setReady(true));
  }, []);

  const saveSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  // 로그인 전 요청 (로그인, 회원가입)
  const request = async (path, body) => {
    const res = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    saveSession(data);
    await syncTaste();
  };

  // 로그인 후 요청 (토큰을 헤더에 실어서 보냄)
  const authRequest = async (method, path, body) => {
    const res = await fetch(`${API}/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  };

  const login = (email, password) => request("login", { email, password });
  const signup = (email, password, nickname) =>
    request("signup", { email, password, nickname });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("tasteAnswers"); // 다음 사람에게 결과가 넘어가지 않게
    setUser(null);
  };

  const updateNickname = async (nickname) => {
    const data = await authRequest("PATCH", "nickname", { nickname });
    const newUser = { ...user, nickname: data.nickname };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const changePassword = (currentPassword, newPassword) =>
    authRequest("PATCH", "password", { currentPassword, newPassword });

  const deleteAccount = async (password) => {
    await authRequest("DELETE", "account", { password });
    logout();
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, updateNickname, changePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);