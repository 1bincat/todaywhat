import { useEffect } from "react";
import "./ConfirmModal.css";

// 공용 확인 모달 (버튼이 3개 이상이면 세로로 쌓임)
export default function ConfirmModal({ open, icon, title, message, buttons = [], onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {icon && <div className="cm-icon">{icon}</div>}
        <h2 className="cm-title">{title}</h2>
        {message && <p className="cm-msg">{message}</p>}
        <div className={buttons.length > 2 ? "cm-actions col" : "cm-actions"}>
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              className={`cm-btn ${b.variant ?? "secondary"}`}
              onClick={b.onClick}
              disabled={b.disabled}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}