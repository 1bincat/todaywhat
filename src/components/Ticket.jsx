import './Ticket.css';

export default function Ticket({ title, place, region, date, duration, cost, companion }) {
  return (
    <div className="ticket">
      <div className="ticket-main">
        <span className="ticket-label">TODAY'S TICKET</span>
        <h2 className="ticket-title">{title}</h2>
        <p className="ticket-place">📍 {region} · {place}</p>
        <div className="ticket-meta">
          <div><small>TIME</small><b>{duration}</b></div>
          <div><small>COST</small><b>{cost}</b></div>
        </div>
      </div>
      <div className="ticket-stub">
        <small>DATE</small>
        <b>{date}</b>
        <small>WITH</small>
        <b>{companion}</b>
      </div>
    </div>
  );
}