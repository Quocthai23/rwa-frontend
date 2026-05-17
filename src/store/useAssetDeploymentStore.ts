import { create } from 'zustand';

interface AssetDeploymentStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useAssetDeploymentStore = create<AssetDeploymentStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (open: boolean) => set({ isOpen: open }),
}));
