import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/home";

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/", { replace: true });
  }

  const handleSubmit = async () => {
  setError("");

  if (isSignup) {
    if (!EMAIL_RE.test(email.trim())) {
      setError("올바른 이메일 형식으로 입력해주세요. (예: example@email.com)");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
  }

  try {
    if (isSignup) await signup(email.trim(), password, nickname);
    else await login(email.trim(), password);
    navigate(from, { replace: true });
  } catch (e) {
    setError(e.message);
  }
};

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError("");
  };

  return (
    <div className="login-page">
      <button className="login-back" onClick={goBack}>
        ← 뒤로
      </button>

      <div className="login-ticket">
        <div className="login-band">
          🚆 {isSignup ? "NEW PASSENGER" : "BOARDING PASS"}
        </div>

        <div className="login-body">
          <h2>{isSignup ? "회원가입" : "로그인"}</h2>
          <p className="login-sub">
            {isSignup
              ? "나만의 여행 기록을 시작해요."
              : "저장한 티켓과 기록을 만나보세요."}
          </p>

          <label>이메일</label>
          <input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {isSignup && (
            <>
              <label>닉네임</label>
              <input
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </>
          )}

          <label>비밀번호</label>
          <input
            type="password"
            placeholder={isSignup ? "비밀번호 (8자 이상)" : "비밀번호"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" onClick={handleSubmit}>
            {isSignup ? "가입하기" : "로그인"}
          </button>
        </div>

        <div className="login-divider" />

        <button className="login-switch" onClick={toggleMode}>
          {isSignup ? "이미 계정이 있어요" : "아직 계정이 없어요 →"}
        </button>
      </div>
    </div>
  );
}