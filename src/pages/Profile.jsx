import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildProfile } from '../data/tasteResult';
import './Profile.css';

function loadAnswers() {
  try {
    return JSON.parse(sessionStorage.getItem('tasteAnswers')) || [];
  } catch {
    return [];
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const answers = loadAnswers();
  const profile = answers.length ? buildProfile(answers) : null;

  return (
    <div className="pf">
      <div className="pf-head">
        <h1 className="pf-title">MY PASSPORT</h1>
        <div className="pf-account">
          <span className="pf-user">{user.nickname}님</span>
          <button
            className="pf-settings"
            onClick={() => navigate('/settings')}
            aria-label="계정 설정"
          >
            ⚙
          </button>
        </div>
      </div>

      <section className="pf-card">
        <small>MY TASTE</small>
        {profile ? (
          <>
            <h2 className="pf-nick">{profile.nickname}</h2>
            <div className="pf-chips">
              {profile.traits.map((t) => (
                <span key={t.id} className="pf-chip">
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="pf-empty">아직 취향 테스트를 안 했어요</p>
        )}
        <button className="pf-retake" onClick={() => navigate('/taste-test')}>
          {profile ? '취향 테스트 다시 하기' : '취향 테스트 하러 가기'}
        </button>
      </section>

      <section className="pf-card">
        <small>MY JOURNEY</small>
        <div className="pf-stats">
          <div><b>0</b><span>저장한 티켓</span></div>
          <div><b>0</b><span>다녀온 지역</span></div>
        </div>
      </section>

      <section className="pf-card">
        <small>MY MAP</small>
        <div className="pf-map">🗺️ 활동한 곳을 지도로 볼 수 있게 될 거예요</div>
      </section>
    </div>
  );
}