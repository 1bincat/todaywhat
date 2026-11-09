import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Splash.css';

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasTaste = !!sessionStorage.getItem('tasteAnswers');

  return (
    <div className="splash">
      <div className="splash-text">
        <h1>오늘<br />뭐하지?</h1>
        <p>오늘의 작은 선택이<br />특별한 하루를 만들어요.</p>
      </div>

      <div className="splash-tickets">
        <div className="mini-ticket back">
          <span>BOARDING PASS</span>
        </div>
        <div className="mini-ticket front">
          <div className="band">TRAIN TICKET · TODAY</div>
          <div className="route">
            <div><small>FROM</small><b>MY HOME</b></div>
            <span>→</span>
            <div><small>TO</small><b>???</b></div>
          </div>
        </div>
      </div>

      <div className="splash-actions">
        <button
          className="btn-primary"
          onClick={() => navigate(hasTaste ? '/home' : '/taste-test')}
        >
          {hasTaste ? '이어서 하기 →' : '시작하기 →'}
        </button>
        {!user && (
          <button className="btn-text" onClick={() => navigate('/login')}>
            로그인하기
          </button>
        )}
      </div>
    </div>
  );
}