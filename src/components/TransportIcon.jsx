import { Footprints, Bus, Car, Train, Plane, Ticket } from 'lucide-react';

// 티켓에 저장된 이동수단 값/라벨(예: 'public', '대중교통', '🚌 대중교통')에서 아이콘을 고름
function pick(transport, type) {
  const t = String(transport ?? '');
  if (/도보|walk/i.test(t)) return Footprints;
  if (/대중교통|public|bus/i.test(t)) return Bus;
  if (/택시|taxi|자가용|car/i.test(t)) return Car;
  if (/기차|train/i.test(t)) return Train;
  if (/비행기|airplane|plane/i.test(t)) return Plane;
  // 이동수단 정보가 없는 예전 티켓은 유형으로 대체
  return type === 'travel' ? Plane : Ticket;
}

export default function TransportIcon({ transport, type, size = 24 }) {
  const Icon = pick(transport, type);
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}