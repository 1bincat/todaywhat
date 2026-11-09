import {
  Compass, Sofa, Search, Wind, Users, Headphones, Heart, Check,
  Home, TreePine, Footprints, Coffee, PartyPopper, Moon, Star, KeyRound,
} from 'lucide-react';

const ICONS = {
  new: Compass,
  familiar: Sofa,
  deep: Search,
  wide: Wind,
  together: Users,
  alone: Headphones,
  emotional: Heart,
  practical: Check,
  indoor: Home,
  outdoor: TreePine,
  active: Footprints,
  relax: Coffee,
  lively: PartyPopper,
  calm: Moon,
  popular: Star,
  hidden: KeyRound,
};

export default function TraitIcon({ value, size = 20 }) {
  const Icon = ICONS[value];
  return Icon ? <Icon size={size} strokeWidth={1.8} aria-hidden="true" /> : null;
}