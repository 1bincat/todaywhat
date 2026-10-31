import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchTickets } from '../api/tickets';
import FlowStep from '../components/FlowStep';
import './Home.css';

const stars = (n = 0) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!user) {
      setRecent([]);
      return;
    }
    fetchTickets(5)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [user]);

  const handleFlowComplete = (selectedConditions) => {
    setIsModalOpen(false);
    navigate('/result', { state: { conditions: selectedConditions } });
  };

  return (
    <div className="home">
      <p className="home-hello">오늘은</p>
      <h1 className="home-title">
        어떤 하루를<br />보내볼까요?
      </h1>

      <button className="home-card" onClick={() => setIsModalOpen(true)}>
        <div className="home-card-band">🚆 TODAY TRIP</div>
        <div className="home-card-body">
          <h2>오늘 뭐하지?</h2>
          <p>
            남은 시간, 예산, 동행에 맞춰<br />오늘의 목적지를 골라드려요
          </p>
          <span className="home-card-go">출발하기 →</span>
        </div>
      </button>

      <section className="home-recent">
        <small>RECENT TICKETS</small>
        {!user && <p>로그인하면 저장한 티켓이 여기에 모여요.</p>}
        {user && recent.length === 0 && (
          <p>아직 저장한 티켓이 없어요. 첫 여정을 떠나볼까요?</p>
        )}
        {recent.length > 0 && (
          <div className="home-recent-list">
            {recent.map(({ id, ticket, journey }) => (
              <button
                key={id}
                className="home-recent-card"
                onClick={() => navigate(`/ticket/${id}`)}
              >
                <span className="home-recent-icon">{ticket.type === 'travel' ? '✈' : '🚆'}</span>
                <b className="home-recent-place">{ticket.place}</b>
                <span className="home-recent-region">{ticket.region}</span>
                {journey?.rating ? (
                  <em className="home-recent-stars">{stars(journey.rating)}</em>
                ) : (
                  <em className="home-recent-todo">기록 남기기</em>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <FlowStep
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFlowComplete}
      />
    </div>
  );
}