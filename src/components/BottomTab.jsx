import { NavLink } from 'react-router-dom';
import './BottomTab.css';

const tabs = [
  { to: '/home', icon: '🏠', label: '홈' },
  { to: '/journey', icon: '🎫', label: '기록' },
  { to: '/profile', icon: '👤', label: '프로필' },
];

export default function BottomTab() {
  return (
    <nav className="tab">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}