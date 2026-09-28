import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tasteQuestions from '../data/tasteQuestions';
import './TasteTest.css';

export default function TasteTest() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const q = tasteQuestions[index];
  const total = tasteQuestions.length;

  const choose = (value) => {
    const next = [...answers.slice(0, index), { id: q.id, value }];
    setAnswers(next);
    if (index === total - 1) {
      sessionStorage.setItem('tasteAnswers', JSON.stringify(next));
      navigate('/taste-profile');
    } else {
      setIndex(index + 1);
    }
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
    else navigate('/');
  };

  return (
    <div className="taste">
      <div className="taste-top">
        <button className="taste-back" onClick={goBack}>←</button>
        <span className="taste-count">{index + 1} / {total}</span>
      </div>

      <div className="taste-bar">
        <div
          className="taste-bar-fill"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <p className="taste-topic">{q.topic}</p>
      <h1 className="taste-title">둘 중 더 나다운 쪽은?</h1>

      <div className="taste-options">
        {[q.a, q.b].map((opt) => (
          <button
            key={opt.value}
            className={`taste-card ${answers[index]?.value === opt.value ? 'selected' : ''}`}
            onClick={() => choose(opt.value)}
          >
            <span className="taste-emoji">{opt.emoji}</span>
            <span className="taste-text">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}