import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProtectedRoute.css";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user) return children;

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-icon">🎫</div>
        <h3>로그인한 계정만 이용할 수 있어요</h3>
        <p>
          저장한 티켓과 나의 기록은
          <br />
          로그인 후에 확인할 수 있어요.
        </p>

        <button
          className="gate-primary"
          onClick={() => navigate("/login", { state: { from: location } })}
        >
          로그인하기
        </button>
        <button className="gate-secondary" onClick={() => navigate("/home")}>
          홈으로
        </button>
      </div>
    </div>
  );
}