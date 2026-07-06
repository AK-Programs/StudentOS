import { HouseType, SectionType } from '../types';

export const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

export const SECTIONS: SectionType[] = ['Astra', 'Elera', 'Solara', 'Vega'];

export const HOUSES: HouseType[] = ['Ruby', 'Emerald', 'Sapphire', 'Topaz'];

export const HOUSE_COLORS: Record<HouseType, { bg: string; text: string; border: string }> = {
  Ruby:     { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30' },
  Emerald:  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Sapphire: { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  border: 'border-indigo-500/30' },
  Topaz:    { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30' },
};

export const EDITABLE_ROLES = ['teacher', 'coordinator', 'admin', 'super_admin'] as const;
