import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { fetchRecommend } from "../api/recommend";
import { loadTaste } from "../api/taste";
import { saveTicket } from "../api/tickets";
import { buildProfile } from "../data/tasteResult";
import Ticket from "../components/Ticket";
import ConfirmModal from "../components/ConfirmModal";
import "./Result.css";

const CACHE_KEY = "resultCache";

const COMPANION_LABEL = {
  solo: "혼자",
  friend: "친구와",
  couple: "연인과",
  family: "가족과",
};

// 티켓에 표시할 이동수단
const TRANSPORT_LABEL = {
  walk: "도보",
  public: "대중교통",
  taxi: "택시",
  car: "자가용",
  train: "기차",
  airplane: "비행기",
};

// 티켓에 표시할 여유시간(일상) / 기간(여행)
const SPARE_TIME_LABEL = {
  under_1h: "30분~1시간",
  "1_2h": "1~2시간",
  "2_4h": "2~4시간",
  over_4h: "4시간 이상",
};
const TRAVEL_DURATION_LABEL = {
  day: "당일치기",
  "1n2d": "1박 2일",
  "2n3d": "2박 3일",
  "3n_over": "3박 4일 이상",
};

const MESSAGES = [
  "취향을 분석하는 중...",
  "조건에 맞는 장소를 찾는 중...",
  "티켓을 발권하는 중...",
];

// 취향 답 → AI에 보낼 읽기 쉬운 정보 (비로그인: sessionStorage, 없으면 서버)
async function getTasteProfile() {
  try {
    let answers = [];
    try {
      answers = JSON.parse(sessionStorage.getItem("tasteAnswers")) || [];
    } catch {
      answers = [];
    }
    if (!answers.length) answers = (await loadTaste()) ?? [];
    if (!answers.length) return null;
    const p = buildProfile(answers);
    return { type: p.nickname, traits: p.traits.map((t) => t.label) };
  } catch {
    return null;
  }
}

// 같은 조건으로 저장된 결과가 있으면 돌려줌
function readCache(conditions) {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    return c && c.key === JSON.stringify(conditions) ? c : null;
  } catch {
    return null;
  }
}

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
  const navType = useNavigationType(); // 뒤로가기면 "POP", 새로 이동하면 "PUSH"
  const conditions = state?.conditions;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState({}); // { 장 번호: 저장된 티켓 id }
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null); // 저장 완료 팝업 { id, duplicated }
  const [ask, setAsk] = useState(null); // 확인 모달: 'login' | 'leave'

  const swipeRef = useRef(null);
  const seen = useRef([]); // 이미 보여준 장소 (재추천 때 제외용)
  const called = useRef(false);
  const restored = useRef(null);

  const today = new Date().toLocaleDateString("ko-KR");

  const isTravel = conditions?.type === "travel";
  const transport = TRANSPORT_LABEL[conditions?.transport];
  const spareTime = isTravel
    ? TRAVEL_DURATION_LABEL[conditions?.travelDuration]
    : SPARE_TIME_LABEL[conditions?.availableTime];

  // 주변 즐길거리는 여행에서만 (일상에서도 켜려면 이 조건을 바꾸면 돼요)
  const canAround = isTravel;

  const load = async () => {
    setLoading(true);
    setError(false);
    setActive(0);
    try {
      const tasteProfile = await getTasteProfile();
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

  // 처음 들어왔을 때: 뒤로가기로 돌아온 거면 저장된 결과 복원, 아니면 새로 추천
  useEffect(() => {
    if (!conditions) {
      navigate("/home", { replace: true });
      return;
    }
    if (called.current) return; // StrictMode에서 무료 호출이 두 번 나가는 것 방지
    called.current = true;

    const cached = navType === "POP" ? readCache(conditions) : null;
    if (cached) {
      restored.current = cached;
      seen.current = cached.seen ?? [];
      setResults(cached.results);
      setActive(cached.active ?? 0);
      setSaved(cached.saved ?? {});
      setLoading(false);
      return;
    }

    sessionStorage.removeItem(CACHE_KEY);
    load();
  }, []);

  // 결과가 바뀔 때마다 저장 (주변 페이지에 다녀와도 유지되도록)
  useEffect(() => {
    if (!conditions || loading || error || results.length === 0) return;
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          key: JSON.stringify(conditions),
          results,
          seen: seen.current,
          active,
          saved,
        })
      );
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [results, active, saved, loading]);

  // 복원했을 때 보던 장으로 스크롤
  useEffect(() => {
    if (loading || !restored.current) return;
    const el = swipeRef.current;
    if (el) el.scrollTo({ left: restored.current.active * el.clientWidth });
    restored.current = null;
  }, [loading]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i) => {
    const el = swipeRef.current;
    if (!el || i < 0 || i >= results.length) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!localStorage.getItem("token")) {
      setAsk("login");
      return;
    }
    if (saving || saved[active]) return;

    const r = results[active];
    const ticket = {
      ...r,
      type: conditions.type,
      date: today,
      companion: COMPANION_LABEL[conditions.companion],
      departure: conditions.location,
      arrival: r.place,
      transport,
      spareTime,
    };

    setSaving(true);
    try {
      const { id, duplicated } = await saveTicket(ticket, conditions);
      setSaved((s) => ({ ...s, [active]: id }));
      setDone({ id, duplicated: Boolean(duplicated) });
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const goAround = () => {
    const current = results[active];
    if (!current) return;
    navigate("/around", { state: { ticket: { ...current, type: conditions.type } } });
  };

  // 홈으로 나가기 (결과 화면은 기록에서 지워서, 홈에서 뒤로가기를 눌러도 다시 안 나옴)
  const goHome = () => {
    sessionStorage.removeItem(CACHE_KEY);
    navigate("/home", { replace: true });
  };

  const handleDone = () => {
    const loggedIn = Boolean(localStorage.getItem("token"));
    // 로그인했는데 저장한 티켓이 없을 때만 확인 모달 (비로그인은 바로 홈으로)
    if (loggedIn && Object.keys(saved).length === 0) {
      setAsk("leave");
      return;
    }
    goHome();
  };

  if (!conditions) return null;
  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="result-page result-center">
        <p>추천을 만들지 못했어요</p>
        <div className="actions">
          <button className="btn-sub" onClick={() => navigate(-1)}>돌아가기</button>
          <button className="btn-main" onClick={load}>다시 시도</button>
        </div>
      </div>
    );
  }

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
                companion={COMPANION_LABEL[conditions.companion]}
                departure={conditions.location}
                arrival={r.place}
                transport={transport}
                spareTime={spareTime}
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

      {canAround && (
        <button className="btn-around" onClick={goAround}>
          🔎 {results[active]?.place} 주변에서 뭐 할까?
        </button>
      )}

      <div className="actions">
        <button className="btn-sub" onClick={handleSave} disabled={saving || Boolean(saved[active])}>
          {saved[active] ? "저장됨 ✓" : saving ? "저장 중..." : "💾 저장"}
        </button>
        <button className="btn-main" onClick={load}>
          🔄 다시 추천받기
        </button>
      </div>

      <button className="btn-done" onClick={handleDone}>
        완료하고 홈으로
      </button>

      {/* 저장 완료 팝업 */}
      {done && (
        <div className="save-overlay" onClick={() => setDone(null)}>
          <div className="save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-check">✓</div>
            <h2>{done.duplicated ? "이미 저장된 티켓이에요" : "티켓이 저장되었어요!"}</h2>
            <p>다녀온 뒤에는 내 기록에서 별점과 후기, 사진을 남길 수 있어요.</p>
            <div className="save-actions">
              <button className="btn-sub" onClick={() => navigate("/journey")}>
                내 기록 보기
              </button>
              <button className="btn-main" onClick={goHome}>
                홈으로
              </button>
            </div>
            <button className="save-close" onClick={() => setDone(null)}>
              다른 티켓 더 보기
            </button>
          </div>
        </div>
      )}

      {/* 로그인 안내 */}
      <ConfirmModal
        open={ask === "login"}
        icon="🔒"
        title="로그인이 필요해요"
        message="티켓을 저장하려면 로그인해야 해요. 로그인하면 저장한 티켓을 내 기록에서 다시 볼 수 있어요."
        onClose={() => setAsk(null)}
        buttons={[
          { label: "나중에 할게요", variant: "secondary", onClick: () => setAsk(null) },
          { label: "로그인하러 가기", variant: "primary", onClick: () => navigate("/login") },
        ]}
      />

      {/* 로그인했지만 저장 없이 나갈 때 */}
      <ConfirmModal
        open={ask === "leave"}
        title="저장한 티켓이 없어요"
        message="저장하지 않고 나가면 이 추천 결과는 사라져요. 그래도 나갈까요?"
        onClose={() => setAsk(null)}
        buttons={[
          { label: "계속 둘러보기", variant: "secondary", onClick: () => setAsk(null) },
          { label: "그래도 나갈래요", variant: "primary", onClick: goHome },
        ]}
      />
    </div>
  );
}