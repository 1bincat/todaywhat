import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import "./Login.css";

const DOMAINS = [
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
  "icloud.com",
  "outlook.com",
];

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/home";

  const [isSignup, setIsSignup] = useState(false);
  const [emailId, setEmailId] = useState("");
  const [domain, setDomain] = useState("gmail.com");
  const [customDomain, setCustomDomain] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 아이디 + 도메인 → 이메일 (전각 문자는 반각으로 정리)
  const buildEmail = () => {
    const id = emailId.trim().normalize("NFKC");
    if (id.includes("@")) return id; // 전체 이메일을 붙여넣은 경우
    const d = (domain === "custom" ? customDomain : domain).trim().normalize("NFKC");
    return `${id}@${d}`;
  };

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/", { replace: true });
  };

  const handleSubmit = async () => {
    setError("");
    const email = buildEmail();

    if (isSignup) {
      if (!EMAIL_RE.test(email)) {
        setError("올바른 이메일 형식으로 입력해주세요. (예: example@email.com)");
        return;
      }
      if (password.length < 8) {
        setError("비밀번호는 8자 이상이어야 해요.");
        return;
      }
    }

    try {
      if (isSignup) await signup(email, password, nickname);
      else await login(email, password);
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
          {isSignup ? "NEW PASSENGER" : "BOARDING PASS"}
        </div>

        <div className="login-body">
          <h2>{isSignup ? "회원가입" : "로그인"}</h2>
          <p className="login-sub">
            {isSignup
              ? "나만의 여행 기록을 시작해요."
              : "저장한 티켓과 기록을 만나보세요."}
          </p>

          <label>이메일</label>
          <div className="login-email-row">
            <input
              placeholder="아이디"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
            />
            <span className="login-at">@</span>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              aria-label="이메일 주소 선택"
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="custom">직접 입력</option>
            </select>
          </div>
          {domain === "custom" && (
            <input
              className="login-domain-custom"
              placeholder="직접 입력 (예: school.ac.kr)"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
            />
          )}

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
          <PasswordInput
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