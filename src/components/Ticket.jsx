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
  stayTime,
  duration, // 예전 티켓 호환용
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
          {travelTime && <div><small>이동</small><b>{travelTime}</b></div>}
          {stayTime && <div><small>머무는 시간</small><b>{stayTime}</b></div>}
          {!travelTime && !stayTime && duration && (
            <div><small>TIME</small><b>{duration}</b></div>
          )}
          {cost && <div><small>COST</small><b>{cost}</b></div>}
          {companion && <div><small>WITH</small><b>{companion}</b></div>}
        </div>

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