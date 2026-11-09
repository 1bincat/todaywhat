import { useNavigate } from 'react-router-dom';
import { buildProfile } from '../data/tasteResult';
import TraitIcon from '../components/TraitIcon';
import './TasteProfile.css';

function loadAnswers() {
  try {
    return JSON.parse(sessionStorage.getItem('tasteAnswers')) || [];
  } catch {
    return [];
  }
}

export default function TasteProfile() {
  const navigate = useNavigate();
  const answers = loadAnswers();

  if (answers.length === 0) {
    return (
      <div className="profile">
        <h1 className="profile-empty">아직 취향 테스트를 안 했어요</h1>
        <button className="btn-primary" onClick={() => navigate('/taste-test')}>
          테스트 하러 가기
        </button>
      </div>
    );
  }

  const { nickname, traits } = buildProfile(answers);

  return (
    <div className="profile">
      <p className="profile-intro">당신의 취향을 찾았어요</p>

      <div className="profile-card">
        <div className="profile-band">MY TASTE CARD</div>
        <div className="profile-body">
          <small>NAME</small>
          <h1 className="profile-nickname">{nickname}</h1>

          <div className="profile-traits">
            {traits.map((t) => (
              <span key={t.id} className="profile-chip">
              <span className="profile-mark"><TraitIcon value={t.value} size={14} /></span>
              {t.label}
            </span>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn-primary" onClick={() => navigate('/home')}>
          이 취향으로 시작하기 →
        </button>
        <button className="btn-text" onClick={() => navigate('/taste-test')}>
          테스트 다시 하기
        </button>
      </div>
    </div>
  );
}