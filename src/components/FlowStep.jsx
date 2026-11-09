import React, { useState } from 'react';
import './FlowStep.css';

const FlowStep = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState('daily');
  const [location, setLocation] = useState('');
  const [isLocLoading, setIsLocLoading] = useState(false);

  const [availableTime, setAvailableTime] = useState('1_2h');
  const [travelDuration, setTravelDuration] = useState('day');

  const [companion, setCompanion] = useState('solo');

  const [budget, setBudget] = useState('free');
  const [transport, setTransport] = useState('public');
  const [condition, setCondition] = useState('normal');
  const [travelStyle, setTravelStyle] = useState('sightseeing');
  const [includeStopovers, setIncludeStopovers] = useState(false);

  if (!isOpen) return null;

  const availableTimeOptions = [
    { label: '30분~1시간 (짧게)', value: 'under_1h' },
    { label: '1~2시간 (적당히)', value: '1_2h' },
    { label: '2~4시간 (넉넉히)', value: '2_4h' },
    { label: '4시간 이상 (하루종일)', value: 'over_4h' },
  ];

  const travelDurationOptions = [
    { label: '당일치기', value: 'day' },
    { label: '1박 2일', value: '1n2d' },
    { label: '2박 3일', value: '2n3d' },
    { label: '3박 4일 이상', value: '3n_over' },
  ];

  const companionOptions = [
    { label: '혼자', value: 'solo' },
    { label: '친구', value: 'friend' },
    { label: '연인', value: 'couple' },
    { label: '가족', value: 'family' },
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

  const transportOptions = {
    daily: [
      { label: '도보', value: 'walk' },
      { label: '대중교통', value: 'public' },
      { label: '택시', value: 'taxi' },
      { label: '자가용', value: 'car' },
    ],
    travel: [
      { label: '자가용', value: 'car' },
      { label: '대중교통', value: 'public' },
      { label: '기차', value: 'train' },
      { label: '비행기', value: 'airplane' },
    ],
  };

  const travelStyleOptions = [
    { label: '명소 / 관광', value: 'sightseeing' },
    { label: '체험 / 액티비티', value: 'activity' },
    { label: '휴식 / 힐링', value: 'healing' },
    { label: '식도락 / 맛집', value: 'food' },
  ];

  const conditionOptions = [
    { label: '상쾌함 (에너지 넘침)', value: 'fresh' },
    { label: '보통', value: 'normal' },
    { label: '피곤함 (여유롭게)', value: 'tired' },
    { label: '휴식 필요 (최소 이동)', value: 'rest' },
  ];

  const handleTypeChange = (selectedType) => {
    setType(selectedType);
    setBudget(budgetOptions[selectedType][0].value);
    setTransport(transportOptions[selectedType][0].value);
    setLocation('');
    setIncludeStopovers(false);
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
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=957ecadf1f58433fcc1b049d88ebf46a&libraries=services&autoload=false`;
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

    if (!location.trim()) {
      alert('위치를 입력해 주세요!');
      return;
    }

    const sendData = (lat = null, lng = null) => {
      const formData = {
        type,
        location,
        lat,
        lng,
        companion,
        budget,
        transport,
        ...(type === 'daily'
          ? { availableTime, condition }
          : { travelDuration, travelStyle, includeStopovers }),
      };

      if (onSubmit) onSubmit(formData);
      if (onClose) onClose();
    };

    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(location, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          sendData(result[0].y, result[0].x);
        } else {
          sendData();
        }
      });
    } else {
      sendData();
    }
  };

  const isTravel = type === 'travel';

  const locationLabel = '2. 출발지';
  const locationPlaceholder = isTravel
    ? '예: 서울시 마포구, 대구 수성구 등'
    : '예: 서울시 마포구 연남동';

  const timeLabel = isTravel ? '4. 여행 기간' : '4. 소요 가능 시간';
  const timeOptions = isTravel ? travelDurationOptions : availableTimeOptions;
  const timeValue = isTravel ? travelDuration : availableTime;
  const setTimeValue = isTravel ? setTravelDuration : setAvailableTime;

  const budgetLabel = isTravel ? '5. 예산 범위 (하루 기준)' : '5. 예산 범위';
  const transportLabelNumber = '6.';
  const lastSectionLabelNumber = '7.';

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

          {/* 2. 현재 위치 입력 */}
          <div className="flow-section">
            <label className="flow-label">{locationLabel}</label>
            <div className="location-input-group">
              <input
                type="text"
                placeholder={locationPlaceholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flow-input"
              />
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
                경유지 추천받기 (여행지로 가는 길에 들를 곳도 함께)
              </label>
            )}
          </div>

          {/* 3. 동행 유무 선택 */}
          <div className="flow-section">
            <label className="flow-label">3. 동행 유무</label>
            <div className="grid-group">
              {companionOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={companion === item.value ? 'btn active' : 'btn'}
                  onClick={() => setCompanion(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 일상: 소요 가능 시간 / 여행: 여행 기간 */}
          <div className="flow-section">
            <label className="flow-label">{timeLabel}</label>
            <div className="grid-group">
              {timeOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={timeValue === item.value ? 'btn active' : 'btn'}
                  onClick={() => setTimeValue(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. 예산 범위 선택 */}
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

          {/* 6. 이동 수단 선택 */}
          <div className="flow-section">
            <label className="flow-label">{transportLabelNumber} 이동 수단</label>
            <div className="grid-group">
              {transportOptions[type].map((item) => (
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

          {/* 7. 동적 조건 (일상: 현재 컨디션 / 여행: 여행 스타일) */}
          <div className="flow-section">
            <label className="flow-label">
              {isTravel ? `${lastSectionLabelNumber} 여행 스타일` : `${lastSectionLabelNumber} 현재 컨디션`}
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