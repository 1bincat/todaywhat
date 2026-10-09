import React, { useState } from 'react';
import './FlowStep.css';

const FlowStep = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null;

  const [type, setType] = useState('daily');
  const [location, setLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [includeStopovers, setIncludeStopovers] = useState(true);
  const [isLocLoading, setIsLocLoading] = useState(false);

  const [availableTime, setAvailableTime] = useState('1_2h');

  const [budget, setBudget] = useState('free');
  const [transport, setTransport] = useState('public');
  const [condition, setCondition] = useState('normal'); 
  const [travelStyle, setTravelStyle] = useState('sightseeing');

  const availableTimeOptions = [
    { label: '30분~1시간', value: 'under_1h' },
    { label: '1~2시간', value: '1_2h' },
    { label: '3~4시간', value: '3_4h' },
    { label: '5시간 이상', value: 'over_5h' },
  ];

  const budgetOptions = {
    daily: [
      { label: '무료', value: 'free' },
      { label: '1만원 이하', value: '10k_under' },
      { label: '3만원 이하', value: '30k_under' },
      { label: '5만원 이상', value: '50k_over' },
    ],
    travel: [
      { label: '5만원 이하', value: '50k_under' },
      { label: '10만원 이하', value: '100k_under' },
      { label: '15만원 이하', value: '150k_under' },
      { label: '20만원 이상', value: '200k_over' },
    ],
  };

  const travelStyleOptions = [
    { label: '🏛️ 명소 / 관광', value: 'sightseeing' },
    { label: '🏄 체험 / 액티비티', value: 'activity' },
    { label: '🌿 휴식 / 힐링', value: 'healing' },
    { label: '🍕 식도락 / 맛집', value: 'food' },
  ];

  const conditionOptions = [
    { label: '⚡ 상쾌함 (에너지 넘침)', value: 'fresh' },
    { label: '🙂 보통', value: 'normal' },
    { label: '🥱 피곤함 (여유롭게)', value: 'tired' },
    { label: '🛋️ 휴식 필요 (최소 이동)', value: 'rest' },
  ];

  const handleTypeChange = (selectedType) => {
    setType(selectedType);
    setBudget(budgetOptions[selectedType][0].value);
    setLocation('');
    setDestination('');
  };

  const loadKakaoSDKAndGeocode = (longitude, latitude) => {
    const KAKAO_APP_KEY = '957ecadf1f58433fcc1b049d88ebf46a';

    const runGeocoding = () => {
      window.kakao.maps.load(() => {
        if (window.kakao.maps.services && window.kakao.maps.services.Geocoder) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2RegionCode(longitude, latitude, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result[0]) {
              setLocation(result[0].address_name);
            } else {
              alert('주소 정보를 불러오는 데 실패했습니다.');
            }
            setIsLocLoading(false);
          });
        } else {
          alert('카카오 서비스 모듈 로드 실패');
          setIsLocLoading(false);
        }
      });
    };

    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      runGeocoding();
      return;
    }

    const scriptId = 'kakao-map-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
      script.async = true;
      document.head.appendChild(script);
    }

    script.onload = () => {
      runGeocoding();
    };

    script.onerror = () => {
      alert('카카오 지도 스크립트를 불러오는 데 실패했습니다.');
      setIsLocLoading(false);
    };
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('현재 브라우저에서는 위치 정보를 지원하지 않습니다.');
      return;
    }

    setIsLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        loadKakaoSDKAndGeocode(longitude, latitude);
      },
      (error) => {
        console.error('위치 정보를 가져오는데 실패했습니다:', error);
        alert('위치 권한을 허용해 주시거나 직접 입력해 주세요.');
        setIsLocLoading(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      type,
      location,
      ...(type === 'travel' ? { destination, includeStopovers } : {}),
      budget,
      transport,
      ...(type === 'daily' ? { availableTime, condition } : { travelStyle }),
    };
    if (onSubmit) {
      onSubmit(formData);
    }
    if (onClose) {
      onClose();
    }
  };

  const isTravel = type === 'travel';
  const locationLabel = isTravel ? '2. 출발지 → 도착지' : '2. 현재 위치';
  const locationPlaceholder = isTravel
    ? '출발지 (예: 서울역)'
    : '예: 서울시 마포구 연남동';

  const budgetLabel = isTravel ? '4. 예산 범위 (하루 기준)' : '4. 예산 범위';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>맞춤 추천 조건 선택</h2>

        <form onSubmit={handleSubmit}>
          {/* 1. 일상 / 여행 선택 */}
          <div className="flow-section">
            <label className="flow-label">1. 유형 선택</label>
            <div className="button-group">
              <button
                type="button"
                className={type === 'daily' ? 'btn active' : 'btn'}
                onClick={() => handleTypeChange('daily')}
              >
                🏠 일상
              </button>
              <button
                type="button"
                className={type === 'travel' ? 'btn active' : 'btn'}
                onClick={() => handleTypeChange('travel')}
              >
                ✈ 여행
              </button>
            </div>
          </div>

          {/* 2. 동적 위치 입력 */}
          <div className="flow-section">
            <label className="flow-label">{locationLabel}</label>
            <div className="location-input-group">
              <input
                type="text"
                placeholder={locationPlaceholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flow-input"
                style={isTravel ? { minWidth: 0 } : undefined}
              />
              {isTravel && (
                <>
                  <span style={{ alignSelf: 'center', color: '#64748b' }}>→</span>
                  <input
                    type="text"
                    placeholder="도착지 (예: 제주 애월)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="flow-input"
                    style={{ minWidth: 0 }}
                  />
                </>
              )}
              {!isTravel && (
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="location-btn"
                  disabled={isLocLoading}
                >
                  {isLocLoading ? '조회 중...' : '📍 현재 위치'}
                </button>
              )}
            </div>
            {isTravel && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeStopovers}
                  onChange={(e) => setIncludeStopovers(e.target.checked)}
                />
                가는 길에 들를 경유지도 추천받기
              </label>
            )}
          </div>

          {/* 💡 3. 여유 시간 선택 (위치 바로 아래 / 일상일 때만 표시) */}
          {!isTravel && (
            <div className="flow-section">
              <label className="flow-label">3. 여유 시간</label>
              <div className="grid-group">
                {availableTimeOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={availableTime === item.value ? 'btn active' : 'btn'}
                    onClick={() => setAvailableTime(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. 예산 범위 선택 */}
          <div className="flow-section">
            <label className="flow-label">{budgetLabel}</label>
            <div className="grid-group">
              {budgetOptions[type].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={budget === opt.value ? 'btn active' : 'btn'}
                  onClick={() => setBudget(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. 이동 수단 선택 */}
          <div className="flow-section">
            <label className="flow-label">5. 이동 수단</label>
            <div className="grid-group">
              {[
                { label: '🚶 도보', value: 'walk' },
                { label: '🚌 대중교통', value: 'public' },
                { label: '🚗 자가용 / 택시', value: 'car' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={transport === item.value ? 'btn active' : 'btn'}
                  onClick={() => setTransport(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. 동적 조건 (일상: 현재 컨디션 / 여행: 여행 스타일) */}
          <div className="flow-section">
            <label className="flow-label">
              {isTravel ? '5. 여행 스타일' : '6. 현재 컨디션'}
            </label>
            <div className="grid-group">
              {isTravel
                ? travelStyleOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={travelStyle === item.value ? 'btn active' : 'btn'}
                      onClick={() => setTravelStyle(item.value)}
                    >
                      {item.label}
                    </button>
                  ))
                : conditionOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={condition === item.value ? 'btn active' : 'btn'}
                      onClick={() => setCondition(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
            </div>
          </div>

          <button type="submit" className="submit-btn">
            추천받기
          </button>
        </form>
      </div>
    </div>
  );
};

export default FlowStep;