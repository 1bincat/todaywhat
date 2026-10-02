import React, { useState } from 'react';
import './FlowStep.css';

export default function FlowStep({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    duration: '',
    companion: '',
    budget: '',
  });

  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customNights, setCustomNights] = useState('');

  const updateForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = () => {
    if (onComplete) onComplete(formData);
  };

  const handleCustomNightsChange = (e) => {
    const val = e.target.value;
    setCustomNights(val);
    if (val && !isNaN(val) && Number(val) > 0) {
      const nights = Number(val);
      updateForm('duration', `${nights}박 ${nights + 1}일`);
    } else {
      updateForm('duration', '');
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="step-badge">STEP {step} / 4</span>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        {step === 1 && (
          <div className="step-content">
            <h2>어디로 떠나볼까요?</h2>
            <p className="step-desc">원하시는 여정의 종류를 선택해주세요.</p>
            <div className="option-grid">
              <button
                className={`card-btn ${formData.category === '일상' ? 'active' : ''}`}
                onClick={() => { updateForm('category', '일상'); setIsCustomDuration(false); handleNext(); }}
              >
                <span className="icon">☕</span>
                <span className="label">일상 (가벼운 외출)</span>
              </button>
              <button
                className={`card-btn ${formData.category === '여행' ? 'active' : ''}`}
                onClick={() => { updateForm('category', '여행'); setIsCustomDuration(false); handleNext(); }}
              >
                <span className="icon">✈️</span>
                <span className="label">여행 (떠나기)</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2>{formData.category === '일상' ? '얼마나 여유가 있으신가요?' : '여행 기간을 알려주세요!'}</h2>
            <p className="step-desc">시간에 딱 맞는 일정을 찾아드릴게요.</p>

            <div className="option-list">
              {formData.category === '일상' ? (
                ['1~2시간', '3~4시간','5~6시간', '하루 종일'].map((item) => (
                  <button
                    key={item}
                    className={`list-btn ${formData.duration === item ? 'active' : ''}`}
                    onClick={() => updateForm('duration', item)}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <>
                  {['당일치기', '1박 2일', '2박 3일'].map((item) => (
                    <button
                      key={item}
                      className={`list-btn ${!isCustomDuration && formData.duration === item ? 'active' : ''}`}
                      onClick={() => {
                        setIsCustomDuration(false);
                        updateForm('duration', item);
                      }}
                    >
                      {item}
                    </button>
                  ))}

                  <button
                    className={`list-btn ${isCustomDuration ? 'active' : ''}`}
                    onClick={() => {
                      setIsCustomDuration(true);
                      updateForm('duration', customNights ? `${customNights}박 ${Number(customNights) + 1}일` : '');
                    }}
                  >
                    직접 입력하기 (3박 이상)
                  </button>

                  {isCustomDuration && (
                    <div className="custom-input-box">
                      <input
                        type="number"
                        min="3"
                        placeholder="예: 4"
                        value={customNights}
                        onChange={handleCustomNightsChange}
                        className="custom-input"
                      />
                      <span className="custom-unit">
                        박 {customNights && !isNaN(customNights) && Number(customNights) > 0 ? Number(customNights) + 1 : ''}일
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="nav-buttons">
              <button className="prev-btn" onClick={handlePrev}>이전</button>
              <button className="next-btn" onClick={handleNext} disabled={!formData.duration}>
                다음
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2>누구와 함께하시나요?</h2>
            <p className="step-desc">함께하는 사람에 맞춰 장소를 추천합니다.</p>
            <div className="option-grid">
              {['혼자', '친구/연인', '가족', '단체/모임'].map((who) => (
                <button
                  key={who}
                  className={`card-btn compact ${formData.companion === who ? 'active' : ''}`}
                  onClick={() => updateForm('companion', who)}
                >
                  <span className="label">{who}</span>
                </button>
              ))}
            </div>
            <div className="nav-buttons">
              <button className="prev-btn" onClick={handlePrev}>이전</button>
              <button className="next-btn" onClick={handleNext} disabled={!formData.companion}>
                다음
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <h2>예산 범위는 어떻게 되나요?</h2>
            <p className="step-desc">
              {formData.category === '일상'
                ? '1인 기준 예상 비용을 선택해주세요.'
                : '숙소, 교통비 등을 포함한 총 예산을 선택해주세요.'}
            </p>
            <div className="option-list">
              {(formData.category === '일상'
                ? ['5만원 이하', '10만원 이하', '20만원 이하', '상관없음']
                : ['30만원 이하', '50만원 이하', '100만원 이하', '300만원 이하', '상관없음']
              ).map((money) => (
                <button
                  key={money}
                  className={`list-btn ${formData.budget === money ? 'active' : ''}`}
                  onClick={() => updateForm('budget', money)}
                >
                  {money}
                </button>
              ))}
            </div>
            <div className="nav-buttons">
              <button className="prev-btn" onClick={handlePrev}>이전</button>
              <button className="submit-btn" onClick={handleSubmit} disabled={!formData.budget}>
                완료 및 추천받기 ✨
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}