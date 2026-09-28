import { Navigate, Outlet } from 'react-router-dom';
import BottomTab from './BottomTab';
import './BottomTab.css';

export default function TabLayout() {
  const done = sessionStorage.getItem('tasteAnswers')
  if (!done) return <Navigate to="/taste-test" replace />;

  return (
    <>
      <div className="tab-content">
        <Outlet />
      </div>
      <BottomTab />
    </>
  );
}