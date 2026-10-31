import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildProfile } from '../data/tasteResult';
import { loadTaste } from '../api/taste';
import { fetchTickets } from '../api/tickets';
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

  const [answers, setAnswers] = useState(loadAnswers);
  const [tickets, setTickets] = useState(null);

  // 로그인했는데 이 탭에 취향 정보가 없으면 서버에 저장된 걸 불러옴
  useEffect(() => {
    if (!user || answers.length) return;
    loadTaste().then((a) => {
      if (Array.isArray(a) && a.length) setAnswers(a);
    });
  }, [user]);

  // 저장한 티켓은 로그인했을 때만 조회
  useEffect(() => {
    if (!user) {
      setTickets(null);
      return;
    }
    fetchTickets()
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [user]);

  const profile = answers.length ? buildProfile(answers) : null;

  // 다녀온 지역: 기록을 남긴 티켓의 지역 (중복 제외)
  const visitedRegions = new Set(
    (tickets ?? [])
      .filter((t) => t.journey)
      .map((t) => t.ticket.region)
      .filter(Boolean)
  ).size;

  return (
    <div className="pf">
      <div className="pf-head">
        <h1 className="pf-title">MY PASSPORT</h1>
        {user ? (
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
        ) : (
          <button className="pf-login-btn" onClick={() => navigate('/login')}>
            로그인
          </button>
        )}
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

      {user ? (
        <>
          <section className="pf-card">
            <small>MY JOURNEY</small>
            <div className="pf-stats">
              <div><b>{tickets ? tickets.length : '-'}</b><span>저장한 티켓</span></div>
              <div><b>{tickets ? visitedRegions : '-'}</b><span>다녀온 지역</span></div>
            </div>
            <button className="pf-retake" onClick={() => navigate('/journey')}>
              내 기록 보러 가기
            </button>
          </section>

          <section className="pf-card">
            <small>MY MAP</small>
            <div className="pf-map">🗺️ 활동한 곳을 지도로 볼 수 있게 될 거예요</div>
          </section>
        </>
      ) : (
        <section className="pf-card pf-lock">
          <small>MY JOURNEY · MY MAP</small>
          <p className="pf-lock-title">🔒 로그인한 계정만 이용할 수 있어요</p>
          <p className="pf-lock-sub">저장한 티켓과 여행 기록, 지도는 로그인하면 볼 수 있어요.</p>
          <button className="pf-retake" onClick={() => navigate('/login')}>
            로그인하기
          </button>
        </section>
      )}
    </div>
  );
}