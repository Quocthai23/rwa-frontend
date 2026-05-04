import { useCallback } from 'react';

import { useGlobalModalStore } from '@/store/globalModalStore';

type ShowModalParams = {
  animationDuration?: number;
  backdropOpacity?: number;
  content: React.ReactNode;
  enablePanDownToClose?: boolean;
  initialSnapIndex?: number;
  snapPoints?: (number | string)[];
  onClose?: () => void;
};

export function useGlobalModal() {
  const { close, show } = useGlobalModalStore();

  const showModal = useCallback(
    (params: ShowModalParams) => {
      show({
        animationDuration: params.animationDuration,
        backdropOpacity: params.backdropOpacity,
        content: params.content,
        enablePanDownToClose: params.enablePanDownToClose ?? true,
        initialSnapIndex: params.initialSnapIndex,
        snapPoints: params.snapPoints ?? ['60%'],
        onClose: params.onClose,
      });
    },
    [show],
  );

  const closeModal = useCallback(() => {
    close();
  }, [close]);

  return { closeModal, showModal };
}
