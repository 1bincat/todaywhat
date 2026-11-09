import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Crosshair, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buildProfile } from '../data/tasteResult';
import { loadTaste } from '../api/taste';
import { fetchTickets } from '../api/tickets';
import TraitIcon from '../components/TraitIcon';
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

  // 지도가 들어갈 DOM 요소 참조 및 카카오맵/Bounds 객체 저장용 ref
  const mapRef = useRef(null);
  const kakaoMapRef = useRef(null);
  const boundsRef = useRef(null);

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

  // Kakao Map & 별모양 마커 표시 logic
  useEffect(() => {
    if (!user || !tickets || !mapRef.current) return;
    if (!window.kakao || !window.kakao.maps) return;

    window.kakao.maps.load(() => {
      // 1. 지도 기본 생성 (기본 중심: 서울시청)
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      };
      const map = new window.kakao.maps.Map(mapRef.current, options);
      kakaoMapRef.current = map;

      // 2. 진한 네이비색 말풍선+별 마커 이미지 생성
      const createNavyStarMarkerImage = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 29;
        canvas.height = 42;
        const ctx = canvas.getContext('2d');

        // 하단 그림자
        ctx.beginPath();
        ctx.ellipse(14.5, 40, 8, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();

        // 말풍선/핀 바깥 외형 (진한 네이비 #0F172A + 흰색 테두리)
        ctx.beginPath();
        ctx.moveTo(14.5, 1);
        ctx.bezierCurveTo(7.6, 1, 2, 6.6, 2, 13.5);
        ctx.bezierCurveTo(2, 22.8, 14.5, 38, 14.5, 38);
        ctx.bezierCurveTo(14.5, 38, 27, 22.8, 27, 13.5);
        ctx.bezierCurveTo(27, 6.6, 21.4, 1, 14.5, 1);
        ctx.closePath();

        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 핀 내부 중앙 별 (아이보리/밝은 회색 #F8FAFC)
        const drawStar = (cx, cy, spikes, outerRadius, innerRadius) => {
          let rot = (Math.PI / 2) * 3;
          let x = cx;
          let y = cy;
          const step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(cx, cy - outerRadius);
          for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.lineTo(cx, cy - outerRadius);
          ctx.closePath();
          ctx.fillStyle = '#F8FAFC';
          ctx.fill();
        };

        drawStar(14.5, 13.5, 5, 6.5, 3);

        return canvas.toDataURL('image/png');
      };

      const starMarkerImgUrl = createNavyStarMarkerImage();
      const imageSize = new window.kakao.maps.Size(29, 42);
      const imageOption = { offset: new window.kakao.maps.Point(14.5, 40) };

      const starMarkerImage = new window.kakao.maps.MarkerImage(
        starMarkerImgUrl,
        imageSize,
        imageOption
      );

      const bounds = new window.kakao.maps.LatLngBounds();
      boundsRef.current = bounds;

      const geocoder = window.kakao.maps.services
        ? new window.kakao.maps.services.Geocoder()
        : null;

      let hasValidPoint = false;

      // 이전 커스텀 오버레이 보관용 변수
      let activeOverlay = null;

      // 지도 아무 곳이나 클릭하면 열려있는 오버레이 닫기
      window.kakao.maps.event.addListener(map, 'click', () => {
        if (activeOverlay) {
          activeOverlay.setMap(null);
          activeOverlay = null;
        }
      });

      // 마커 클릭 시 오버레이 띄우기
      const attachMarkerClickEvent = (marker, title, address, position) => {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          if (activeOverlay) {
            activeOverlay.setMap(null);
          }

          // 지도 중심 이동 및 확대
          map.setLevel(4, { animate: true });
          map.panTo(position);

          // 이미지 스타일 카드 HTML
          const overlayContent = document.createElement('div');
          overlayContent.style.cssText = `
            position: relative;
            bottom: 55px;
            background: #ffffff;
            border-radius: 12px;
            padding: 14px 18px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            border: 1px solid #e2e8f0;
            min-width: 180px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          `;

          // 삼각형 말풍선 꼬리
          const tail = document.createElement('div');
          tail.style.cssText = `
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid #ffffff;
          `;
          overlayContent.appendChild(tail);

          // 1. 파란색 강조 글씨 (오직 장소명만!)
          const titleEl = document.createElement('div');
          titleEl.style.cssText = `
            font-size: 15px;
            font-weight: 700;
            color: #0284c7;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          `;
          titleEl.innerText = title;
          overlayContent.appendChild(titleEl);

          // 2. 검은색 글씨 (지역명 / 주소만!)
          if (address && address !== title) {
            const addrEl = document.createElement('div');
            addrEl.style.cssText = `
              font-size: 13px;
              color: #334155;
              font-weight: 500;
            `;
            addrEl.innerText = address;
            overlayContent.appendChild(addrEl);
          }

          const overlay = new window.kakao.maps.CustomOverlay({
            content: overlayContent,
            map: map,
            position: position,
            yAnchor: 1,
            zIndex: 3
          });

          activeOverlay = overlay;
        });
      };

      // 기록이 있거나 지역 정보가 있는 티켓 필터링
      const validTickets = tickets.filter(
        (t) => t.journey || (t.ticket && (t.ticket.region || t.ticket.title || t.ticket.placeName || t.ticket.place_name))
      );

      validTickets.forEach((item) => {
        const ticketInfo = item.ticket || item;
        const ticketData = typeof ticketInfo.ticket_data === 'string'
          ? JSON.parse(ticketInfo.ticket_data || '{}')
          : (ticketInfo.ticket_data || {});

        const lat = ticketInfo.lat || ticketInfo.latitude || ticketData.lat;
        const lng = ticketInfo.lng || ticketInfo.longitude || ticketData.lng;

        // [장소명] - 오직 장소명 속성만 추출
        const placeTitle =
          ticketInfo.place ||
          ticketData.place ||
          ticketInfo.place_name ||
          ticketInfo.placeName ||
          ticketData.place_name ||
          ticketData.placeName ||
          item.journey?.place_name ||
          ticketInfo.name ||
          ticketData.name ||
          (ticketInfo.title && !ticketInfo.title.includes(' ') && ticketInfo.title.length < 10 ? ticketInfo.title : null) ||
          '장소';

        // [지역명/주소]
        const placeAddress =
          ticketInfo.region ||
          ticketInfo.address ||
          ticketData.address ||
          '';

        // 1. 좌표값이 존재하는 경우
        if (lat && lng) {
          const position = new window.kakao.maps.LatLng(lat, lng);
          const marker = new window.kakao.maps.Marker({
            map: map,
            position: position,
            image: starMarkerImage,
          });

          attachMarkerClickEvent(marker, placeTitle, placeAddress, position);

          bounds.extend(position);
          hasValidPoint = true;
        }
        // 2. 좌표값은 없으나 주소/지역명이 존재하는 경우 주소 검색
        else if ((placeAddress || placeTitle) && geocoder) {
          const searchQuery = placeAddress || placeTitle;
          geocoder.addressSearch(searchQuery, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const position = new window.kakao.maps.LatLng(
                result[0].y,
                result[0].x
              );
              const marker = new window.kakao.maps.Marker({
                map: map,
                position: position,
                image: starMarkerImage,
              });

              attachMarkerClickEvent(marker, placeTitle, placeAddress, position);

              bounds.extend(position);
              map.setBounds(bounds);
            }
          });
        }
      });

      // 마커가 1개 이상 등록되어 있다면 모든 마커가 보이도록 영역 자동 조정
      if (hasValidPoint) {
        map.setBounds(bounds);
      }
    });
  }, [user, tickets]);

  // 전체 보기 버튼 클릭 시 모든 별마커가 들어오도록 지도 범위 재설정
  const handleResetBounds = () => {
    if (kakaoMapRef.current && boundsRef.current) {
      kakaoMapRef.current.setBounds(boundsRef.current);
    }
  };

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
              <Settings size={20} strokeWidth={1.8} />
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
                  <span className="pf-mark"><TraitIcon value={t.value} size={13} /></span>
                  {t.label}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small>MY MAP</small>
              <button
                onClick={handleResetBounds}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Crosshair size={14} strokeWidth={1.8} /> 전체 마커 한눈에 보기
              </button>
            </div>
            <div
              ref={mapRef}
              className="pf-map"
              style={{
                width: '100%',
                height: '300px',
                borderRadius: '8px',
                marginTop: '8px',
                overflow: 'hidden'
              }}
            />
          </section>
        </>
      ) : (
        <div className="pf-locked-wrap">
          {/* 로그인했을 때와 같은 모양의 가짜 화면 (블러 처리, 실제 데이터 아님) */}
          <div className="pf-locked-content" aria-hidden="true">
            <section className="pf-card">
              <small>MY JOURNEY</small>
              <div className="pf-stats">
                <div><b>0</b><span>저장한 티켓</span></div>
                <div><b>0</b><span>다녀온 지역</span></div>
              </div>
              <button className="pf-retake" tabIndex={-1}>내 기록 보러 가기</button>
            </section>

            <section className="pf-card">
              <small>MY MAP</small>
              <div className="pf-map" style={{ width: '100%', height: '300px', marginTop: '8px' }} />
            </section>
          </div>

          {/* 블러 위에 올라오는 안내 */}
          <div className="pf-lock-overlay">
            <div className="pf-lock-box">
              <p className="pf-lock-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Lock size={16} strokeWidth={1.8} />
                로그인한 계정만 이용할 수 있어요
              </p>
              <p className="pf-lock-sub">저장한 티켓과 여행 기록, 지도는 로그인하면 볼 수 있어요.</p>
              <button className="pf-retake" onClick={() => navigate('/login')}>
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}