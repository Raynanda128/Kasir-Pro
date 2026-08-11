export const DEFAULT_BOTAK_AVATAR = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80';

export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  category: 'botak' | 'preset';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'botak-1',
    name: 'Friendly (Default)',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
    category: 'botak'
  },
  {
    id: 'botak-2',
    name: 'Minimalist',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    category: 'botak'
  },
  {
    id: 'botak-3',
    name: 'Vector 3D',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?topProbability=0&skinColor[]=edb98a&seed=KasirBotakPro',
    category: 'botak'
  },
  {
    id: 'botak-4',
    name: 'Kacamata',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?topProbability=0&accessories[]=prescription02&accessoriesProbability=100&seed=BotakKacamata',
    category: 'botak'
  },
  {
    id: 'kasir-elegan',
    name: 'Kasir Elegan',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    category: 'preset'
  },
  {
    id: 'barista-resto',
    name: 'Barista / Chef Resto',
    url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=200&q=80',
    category: 'preset'
  },
  {
    id: 'manager-pro',
    name: 'Manager Executive',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    category: 'preset'
  }
];
