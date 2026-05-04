import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Position } from '@/types/position';
import type { OrderItem } from '@/types/orders';

interface SelectedPositionState {
  selectedPosition: Position | OrderItem | null;
  setSelectedPosition: (position: Position | OrderItem | null) => void;
  clearSelectedPosition: () => void;
}

export const useSelectedPositionStore = create<SelectedPositionState>()(
  persist(
    (set) => ({
      selectedPosition: null,
      setSelectedPosition: (position: Position | OrderItem | null) => {
        set({ selectedPosition: position });
      },
      clearSelectedPosition: () => {
        set({ selectedPosition: null });
      },
    }),
    {
      name: 'selected-position-storage',
    },
  ),
);
