import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchRecommend } from "../api/recommend";
import { loadTaste } from "../api/taste";
import Ticket from "../components/Ticket";
import "./Result.css";

const TASTE_KEY = "taste"; // ← TasteTest에서 실제로 쓰는 sessionStorage 키로 바꿔야 해요

const MESSAGES = [
  "취향을 분석하는 중...",
  "조건에 맞는 장소를 찾는 중...",
  "티켓을 발권하는 중...",
];

function Loading() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loading">
      <div className="sky">
        <span className="cloud c1">☁️</span>
        <span className="cloud c2">☁️</span>
        <span className="cloud c3">☁️</span>
        <span className="plane">✈️</span>
      </div>
      <p className="loading-text">{MESSAGES[i]}</p>
    </div>
  );
}

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const conditions = state?.conditions;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState({});

  const swipeRef = useRef(null);
  const seen = useRef([]); // 이미 보여준 장소 (재추천 때 제외용)
  const called = useRef(false);

  const today = new Date().toLocaleDateString("ko-KR");

  const load = async () => {
    setLoading(true);
    setError(false);
    setActive(0);
    try {
      const tasteProfile =
        (await loadTaste()) ?? JSON.parse(sessionStorage.getItem(TASTE_KEY) || "null");
      const data = await fetchRecommend({
        tasteProfile,
        conditions,
        exclude: seen.current,
      });
      seen.current = [...seen.current, ...data.map((r) => r.place)];
      setResults(data);
      setSaved({});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conditions) {
      navigate("/home", { replace: true });
      return;
    }
    if (called.current) return; // StrictMode에서 무료 호출이 두 번 나가는 것 방지
    called.current = true;
    load();
  }, []);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i) => {
    const el = swipeRef.current;
    if (!el || i < 0 || i >= results.length) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!localStorage.getItem("token")) {
      if (window.confirm("저장하려면 로그인이 필요해요. 로그인 화면으로 갈까요?")) {
        navigate("/login");
      }
      return;
    }
    // TODO: 티켓 저장 API가 만들어지면 여기서 호출 (results[active] 저장)
    setSaved((s) => ({ ...s, [active]: true }));
  };

  if (!conditions) return null;
  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="result-page result-center">
        <p>추천을 만들지 못했어요 😢</p>
        <div className="actions">
          <button className="btn-sub" onClick={() => navigate(-1)}>돌아가기</button>
          <button className="btn-main" onClick={load}>다시 시도</button>
        </div>
      </div>
    );
  }

  const isTravel = conditions.type === "travel";

  return (
    <div className="result-page">
      <header className="result-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">
          ←
        </button>
        <h1>오늘의 추천 티켓</h1>
        <span className="result-count">{active + 1} / {results.length}</span>
      </header>

      <div className="swipe" ref={swipeRef} onScroll={handleScroll}>
        {results.map((r, i) => (
          <div className="slide" key={i}>
            <div className={i === active ? "print show" : "print"}>
              <Ticket
                {...r}
                type={conditions.type}
                date={today}
                departure={conditions.location}
                arrival={isTravel ? conditions.destination : r.place}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pager">
        <button className="icon-btn" onClick={() => goTo(active - 1)} disabled={active === 0}>
          ‹
        </button>
        <div className="dots">
          {results.map((_, i) => (
            <button
              key={i}
              className={i === active ? "dot on" : "dot"}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번째 티켓`}
            />
          ))}
        </div>
        <button
          className="icon-btn"
          onClick={() => goTo(active + 1)}
          disabled={active === results.length - 1}
        >
          ›
        </button>
      </div>

      <div className="actions">
        <button className="btn-sub" onClick={handleSave}>
          {saved[active] ? "저장됨 ✓" : "💾 저장"}
        </button>
        <button className="btn-main" onClick={load}>
          🔄 다시 추천받기
        </button>
      </div>
    </div>
  );
}