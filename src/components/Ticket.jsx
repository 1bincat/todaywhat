import { QRCodeSVG } from "qrcode.react";
import "./Ticket.css";

export default function Ticket({
  type,
  title,
  place,
  region,
  date,
  cost,
  companion,
  travelTime,
  transport, // "🚌 대중교통" 같은 이동수단 표시
  spareTime, // 일상: 여유시간 / 여행: 기간
  duration, // 예전 티켓 호환용
  activities = [],
  stopovers = [],
  departure,
  arrival,
  reason,
}) {
  const isTravel = type === "travel";
  const naverUrl = place
    ? `https://map.naver.com/p/search/${encodeURIComponent(`${region ?? ""} ${place}`.trim())}`
    : null;
  const path = [departure, ...stopovers, arrival].filter(Boolean);

  return (
    <div className="ticket">
      <div className="ticket-main">
        <div className="ticket-head">
          <span className="ticket-label">{isTravel ? "BOARDING PASS" : "TODAY'S TICKET"}</span>
          <span className="ticket-icon">{isTravel ? "✈" : "🚆"}</span>
        </div>

        {/* 핵심: 추천 장소를 제일 크게 */}
        <div className="ticket-hero">
          <small>{isTravel ? "DESTINATION" : "RECOMMENDED"}</small>
          <h2 className="ticket-place-name">{place}</h2>
          <p className="ticket-region">📍 {region}</p>
          {title && <p className="ticket-tagline">{title}</p>}
        </div>

        {/* 경로는 한 줄로 작게 (출발지 → 경유지 → 도착지) */}
        {path.length > 1 && <p className="ticket-path">{path.join(" → ")}</p>}

        <div className="ticket-meta">
          {travelTime && (
            <div>
              <small>TRAVEL</small>
              <b>{travelTime}</b>
              {transport && <span className="ticket-sub">{transport}</span>}
            </div>
          )}
          {spareTime && (
            <div>
              <small>{isTravel ? "DURATION" : "FREE TIME"}</small>
              <b>{spareTime}</b>
            </div>
          )}
          {!travelTime && !spareTime && duration && (
            <div><small>TIME</small><b>{duration}</b></div>
          )}
          {cost && (
            <div><small>COST</small><b>{cost}</b></div>
          )}
          {companion && (
            <div><small>WITH</small><b>{companion}</b></div>
          )}
        </div>

        {/* 그곳에서 할 수 있는 것 */}
        {activities.length > 0 && (
          <div className="ticket-todo">
            <small>{isTravel ? "THINGS TO DO" : "TO DO"}</small>
            <ul>
              {activities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {reason && <p className="ticket-reason">{reason}</p>}
      </div>

      {naverUrl && (
        <div className="ticket-stub">
          <a className="ticket-qr" href={naverUrl} target="_blank" rel="noreferrer">
            <QRCodeSVG value={naverUrl} size={76} />
          </a>
          <div className="ticket-stub-text">
            <small>SCAN</small>
            <b>네이버 지도에서 장소 보기</b>
            {date && <span className="ticket-date">{date}</span>}
          </div>
        </div>
      )}
    </div>
  );
}