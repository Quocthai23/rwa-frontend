import { useCallback } from 'react';
import { toast, type ToastT } from 'sonner';

type ShowToastParameters = {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
} & Partial<ToastT>;

export const useToast = () => {
  const showToast = useCallback(
    ({ title, message, type = 'success', ...props }: ShowToastParameters) => {
      const baseOptions: Partial<ToastT> = {
        ...props,
        description: message,
        classNames: {
          ...(props.classNames ?? {}),
          title: ['text-body-large-semibold text-white', props.classNames?.title]
            .filter(Boolean)
            .join(' '),
          description: ['text-body-small-regular text-neutral-300', props.classNames?.description]
            .filter(Boolean)
            .join(' '),
        },
        style: {
          ...(props.style ?? {}),
          fontSize: 16,
          borderRadius: '4px',
        },
      };

      switch (type) {
        case 'success':
          toast.success(title, baseOptions);
          break;
        case 'error':
          toast.error(title, baseOptions);
          break;
        case 'info':
          toast.info(title, baseOptions);
          break;
        case 'warning':
          toast.warning(title, baseOptions);
          break;
        default:
          toast(title, baseOptions);
      }
    },
    [],
  );

  const showSuccess = useCallback(
    (title: string, message: string) => {
      showToast({ title, message, type: 'success' });
    },
    [showToast],
  );

  const showError = useCallback(
    (title: string, message: string) => {
      showToast({ title, message, type: 'error' });
    },
    [showToast],
  );

  const showInfo = useCallback(
    (title: string, message: string) => {
      showToast({ title, message, type: 'info' });
    },
    [showToast],
  );

  const showWarning = useCallback(
    (title: string, message: string) => {
      showToast({ title, message, type: 'warning' });
    },
    [showToast],
  );

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};
