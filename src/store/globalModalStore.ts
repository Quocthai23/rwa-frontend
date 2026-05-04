import { create } from 'zustand';

type ModalConfig = {
  animationDuration?: number;
  backdropOpacity?: number;
  content: React.ReactNode;
  enablePanDownToClose?: boolean;
  initialSnapIndex?: number;
  snapPoints?: (number | string)[];
  onClose?: () => void;
};

type GlobalModalStore = {
  config: ModalConfig | null;
  isVisible: boolean;
  close: () => void;
  show: (config: ModalConfig) => void;
};

export const useGlobalModalStore = create<GlobalModalStore>((set) => ({
  config: null,
  isVisible: false,
  close: () => {
    set((state) => {
      state.config?.onClose?.();
      return { config: null, isVisible: false };
    });
  },
  show: (config) => set({ config, isVisible: true }),
}));
