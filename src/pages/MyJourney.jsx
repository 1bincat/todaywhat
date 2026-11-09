import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { fetchTickets, photoSrc } from "../api/tickets";
import TransportIcon from "../components/TransportIcon";
import "./MyJourney.css";

const stars = (n = 0) => "★".repeat(n) + "☆".repeat(5 - n);

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "done", label: "기록 완료" },
  { id: "todo", label: "기록 전" },
];

export default function MyJourney() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTickets()
      .then(setItems)
      .catch((e) => {
        setError(e.message);
        setItems([]);
      });
  }, []);

  const all = items ?? [];
  const done = all.filter((it) => it.journey).length;
  const shown = all.filter((it) =>
    filter === "all" ? true : filter === "done" ? Boolean(it.journey) : !it.journey
  );

  return (
    <div className="mj">
      <h1 className="mj-title">MY JOURNEY</h1>
      {items && !error && (
        <p className="mj-sub">저장한 티켓 {all.length}장 · 기록 완료 {done}장</p>
      )}

      <div className="mj-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={filter === f.id ? "mj-chip is-active" : "mj-chip"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!items && <p className="mj-msg">불러오는 중...</p>}
      {error && <p className="mj-msg">{error}</p>}

      {items && !error && all.length === 0 && (
        <div className="mj-msg">
          <p>아직 저장한 티켓이 없어요.</p>
          <button className="mj-go" onClick={() => navigate("/home")}>
            추천받으러 가기 →
          </button>
        </div>
      )}

      {items && all.length > 0 && shown.length === 0 && (
        <p className="mj-msg">해당하는 티켓이 없어요.</p>
      )}

      <div className="mj-list">
        {shown.map(({ id, ticket, journey }) => (
          <button key={id} className="mj-card" onClick={() => navigate(`/ticket/${id}`)}>
            <div className="mj-thumb">
              {journey?.photoUrl ? (
                <img src={photoSrc(journey.photoUrl)} alt="" />
              ) : (
                <span>
                  <TransportIcon transport={ticket.transport} type={ticket.type} size={26} />
                </span>
              )}
            </div>
            <div className="mj-body">
              <b className="mj-place">{ticket.place}</b>
              <span className="mj-meta">
                {[ticket.region, journey?.visitedAt ?? ticket.date].filter(Boolean).join(" · ")}
              </span>
              {journey ? (
                <>
                  {journey.rating ? <em className="mj-stars">{stars(journey.rating)}</em> : null}
                  {journey.review && <span className="mj-review">{journey.review}</span>}
                </>
              ) : (
                <em className="mj-todo">
                  <Pencil size={13} strokeWidth={1.8} /> 기록 남기기
                </em>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}