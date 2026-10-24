import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAround } from "../api/around";
import "./Around.css";

const TAB_LABEL = {
  AT4: "🏛️ 볼거리",
  FD6: "🍽️ 맛집",
  CE7: "☕ 카페",
  CT1: "🎭 문화",
};

// 탭을 더 줄이고 싶으면 여기 배열만 바꾸면 돼요 (예: travel: ["AT4"])
const TAB_ORDER = {
  daily: ["FD6", "CE7", "AT4", "CT1"],
  travel: ["AT4", "FD6", "CE7", "CT1"],
};

const formatDistance = (m) =>
  m == null ? "" : m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;

const naverUrl = (name, address = "") =>
  `https://map.naver.com/p/search/${encodeURIComponent(
    `${address.split(" ").slice(0, 2).join(" ")} ${name}`.trim()
  )}`;

export default function Around() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ticket = state?.ticket;
  const isTravel = ticket?.type === "travel";
  const tabs = TAB_ORDER[isTravel ? "travel" : "daily"];

  const [tab, setTab] = useState(tabs[0]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!ticket) navigate("/home", { replace: true });
  }, []);

  useEffect(() => {
    if (!ticket?.lat || !ticket?.lng || cache[tab]) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchAround({
      lat: ticket.lat,
      lng: ticket.lng,
      category: tab,
      radius: isTravel ? 10000 : 1000,
      sort: isTravel ? "accuracy" : "distance",
    })
      .then((list) => {
        if (!cancelled) setCache((c) => ({ ...c, [tab]: list }));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, retryKey]);

  if (!ticket) return null;

  const list = cache[tab];
  const hasCoords = Boolean(ticket.lat && ticket.lng);

  return (
    <div className="around-page">
      <header className="around-header">
        <button className="around-back" onClick={() => navigate(-1)} aria-label="뒤로가기">
          ←
        </button>
        <div className="around-title">
          <small>{isTravel ? "AROUND DESTINATION" : "AROUND"}</small>
          <h1>{ticket.place} 주변</h1>
        </div>
      </header>

      {tabs.length > 1 && (
        <div className="around-tabs">
          {tabs.map((code) => (
            <button
              key={code}
              type="button"
              className={tab === code ? "around-tab is-active" : "around-tab"}
              onClick={() => setTab(code)}
            >
              {TAB_LABEL[code]}
            </button>
          ))}
        </div>
      )}

      {ticket.activities?.length > 0 && (
        <div className="around-hint">
          <small>이런 걸 해보면 좋아요</small>
          <div className="around-chips">
            {ticket.activities.map((a, i) => (
              <span className="around-chip" key={i}>{a}</span>
            ))}
          </div>
        </div>
      )}

      <div className="around-list">
        {!hasCoords && (
          <p className="around-msg">이 추천은 위치 정보가 없어서 주변 검색을 할 수 없어요.</p>
        )}

        {hasCoords && loading && <p className="around-msg">주변을 둘러보는 중... ✈️</p>}

        {hasCoords && error && (
          <div className="around-msg">
            <p>불러오지 못했어요 😢</p>
            <button className="around-retry" onClick={() => setRetryKey((k) => k + 1)}>
              다시 시도
            </button>
          </div>
        )}

        {hasCoords && !loading && !error && list?.length === 0 && (
          <p className="around-msg">이 근처에는 검색된 곳이 없어요.</p>
        )}

        {list?.map((p, i) => (
          <div className="place-card" key={`${p.name}-${i}`}>
            <div className="place-top">
              <b className="place-name">{p.name}</b>
              <span className="place-dist">{formatDistance(p.distance)}</span>
            </div>
            <p className="place-cat">{p.category}</p>
            <p className="place-addr">📍 {p.address}</p>
            <div className="place-links">
              <a href={p.url} target="_blank" rel="noreferrer">카카오맵</a>
              <a href={naverUrl(p.name, p.address)} target="_blank" rel="noreferrer">네이버 지도</a>
            </div>
          </div>
        ))}
      </div>

      <p className="around-foot">장소 정보는 카카오맵 기준이에요</p>
    </div>
  );
}