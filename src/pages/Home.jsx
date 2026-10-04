import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FlowStep from '../components/FlowStep';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <p>아직 저장한 티켓이 없어요. 첫 여정을 떠나볼까요?</p>
      </section>

<<<<<<< HEAD
      {/* 모달 팝업 */}
      {isModalOpen && (
        <FlowStep
          onComplete={handleFlowComplete}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
=======
      <FlowStep
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFlowComplete}
      />
>>>>>>> master
    </div>
  );
}