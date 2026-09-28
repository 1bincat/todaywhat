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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 탭이 없는 화면 */}
        <Route path="/" element={<Splash />} />
        <Route path="/taste-test" element={<TasteTest />} />
        <Route path="/taste-profile" element={<TasteProfile />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/result" element={<Result />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />

        {/* 하단 탭이 있는 화면 */}
        <Route element={<TabLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/journey" element={<MyJourney />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}