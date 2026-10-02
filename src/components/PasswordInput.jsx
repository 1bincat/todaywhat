import { useState } from "react";
import "./PasswordInput.css";

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <div className="pw-wrap">
      <input {...props} className="pw-input" type={show ? "text" : "password"} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow(!show)}
        aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}