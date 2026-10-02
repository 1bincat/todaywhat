import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Settings.css";

export default function Settings() {
  const { user, logout, updateNickname, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(user.nickname);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const run = async (fn, successText, after) => {
    setMsg({ type: "", text: "" });
    try {
      await fn();
      setMsg({ type: "ok", text: successText });
      after?.();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true});
  };

  return (
    <div className="settings">
      <button className="settings-back" onClick={() => navigate("/profile")}>
        ← 프로필
      </button>
      <h2>계정 설정</h2>
      <p className="settings-email">{user.email}</p>

      {msg.text && <p className={`settings-msg ${msg.type}`}>{msg.text}</p>}

      <section className="settings-card">
        <h3>닉네임 변경</h3>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <button
          onClick={() => run(() => updateNickname(nickname), "닉네임이 변경되었어요.")}
        >
          변경하기
        </button>
      </section>

      <section className="settings-card">
        <h3>비밀번호 변경</h3>
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호 (8자 이상)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <button
          onClick={() =>
            run(() => changePassword(currentPw, newPw), "비밀번호가 변경되었어요.", () => {
              setCurrentPw("");
              setNewPw("");
            })
          }
        >
          변경하기
        </button>
      </section>

      <section className="settings-card">
        <button className="settings-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </section>

      <section className="settings-card danger">
        {!showDelete ? (
          <button className="settings-delete-open" onClick={() => setShowDelete(true)}>
            회원 탈퇴
          </button>
        ) : (
          <>
            <h3>회원 탈퇴</h3>
            <p className="settings-warn">
              저장한 티켓과 기록이 모두 삭제되고 되돌릴 수 없어요.
            </p>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
            />
            <button
              className="settings-delete"
              onClick={() =>
                run(() => deleteAccount(deletePw), "", () => navigate("/", { replace: true}))
              }
            >
              탈퇴하기
            </button>
            <button className="settings-cancel" onClick={() => setShowDelete(false)}>
              취소
            </button>
          </>
        )}
      </section>
    </div>
  );
}