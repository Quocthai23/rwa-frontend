'use client';

import { useTranslation } from 'react-i18next';
import { useDemoNoticeStore } from '@/store/demoNoticeStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';

export default function DemoUnavailableDialog() {
  const { t } = useTranslation();
  const open = useDemoNoticeStore((s) => s.open);
  const setOpen = useDemoNoticeStore((s) => s.setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-border max-w-[calc(100%-2rem)] gap-4 rounded-2xl px-6 pt-10 pb-6 text-center sm:max-w-md">
        <DialogTitle className="text-foreground text-lg leading-7">
          {t('demoAvailability.title')}
        </DialogTitle>
        <DialogDescription className="leading-6">
          {t('demoAvailability.paymentsDescription')}
        </DialogDescription>
        <Button
          variant="primary-contained"
          className="mt-2 h-11 w-full rounded-lg px-5"
          onClick={() => setOpen(false)}
        >
          {t('common.close')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
