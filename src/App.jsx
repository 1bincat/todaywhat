import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TabLayout from './components/TabLayout';
import Splash from './pages/Splash';
import TasteTest from './pages/TasteTest';
import TasteProfile from './pages/TasteProfile';
import Home from './pages/Home';
import Conditions from './pages/Conditions';
import Result from './pages/Result';
import TicketDetail from './pages/TicketDetail';
import MyJourney from './pages/MyJourney';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Around from './pages/Around';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 탭이 없는 화면 */}
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/taste-test" element={<TasteTest />} />
        <Route path="/taste-profile" element={<TasteProfile />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/result" element={<Result />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/result" element={<Result />} />
        <Route path="/around" element={<Around />} />

        {/* 하단 탭이 있는 화면 */}
        <Route element={<TabLayout />}>
          <Route path="/home" element={<Home />} />
          <Route
            path="/journey"
            element={<ProtectedRoute><MyJourney /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><Settings /></ProtectedRoute>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}