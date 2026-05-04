'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/atoms/button';
import { Checkbox } from '@/components/shared/atoms/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export type OneClickTradingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
  onAccept: () => void;
};

export function OneClickTrading({
  open,
  onOpenChange,
  termsAccepted,
  onTermsAcceptedChange,
  onAccept,
}: OneClickTradingSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleAccept = () => {
    if (!user) {
      onOpenChange(false);
      router.push('/login');
      return;
    }
    onAccept();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="bg-sheet text-foreground mx-auto flex max-h-[90dvh] w-full max-w-192 flex-col overflow-hidden border-none p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-border flex items-start justify-between gap-3 border-b px-4 pt-4 pb-3">
            <DialogTitle className="text-h3-semibold text-foreground min-w-0 flex-1">
              {t('trade.oneClick.title')}
            </DialogTitle>
            <Button
              variant="white-contained"
              className="text-button-large-medium text-primary-500 shrink-0 bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              <span className="text-button-large-medium text-primary-500">
                {t('common.cancel')}
              </span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-body-small-medium text-foreground mb-3 wrap-break-word">
              {t('trade.oneClick.descriptionEnable')}
            </p>
            <p className="text-body-small-medium text-foreground mb-3 wrap-break-word">
              {t('trade.oneClick.descriptionToggle')}
            </p>
            <p className="text-body-small-medium text-foreground mb-2 wrap-break-word">
              {t('trade.oneClick.descriptionImmediate')}
            </p>
            <ul className="text-body-small-medium text-foreground mb-3 list-inside list-disc space-y-1 pl-2">
              <li>{t('trade.oneClick.bulletBidAsk')}</li>
              <li>{t('trade.oneClick.bulletDepthOfMarket')}</li>
            </ul>
            <p className="text-body-small-medium text-foreground mb-3 wrap-break-word">
              {t('trade.oneClick.noAdditionalConfirmation')}
            </p>
            <p className="text-body-small-medium text-foreground mb-4 wrap-break-word">
              {t('trade.oneClick.riskDisclaimer')}
            </p>
          </div>

          <div className="bg-sheet px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <label className="mb-4 flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(checked) => onTermsAcceptedChange(checked === true)}
                className="mt-0.5 h-5 w-5 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
              />
              <span className="text-body-large-semibold text-foreground">
                {t('trade.oneClick.acceptTerms')}
              </span>
            </label>
            <Button
              variant="primary-contained"
              className="w-full items-center justify-center gap-2 py-3"
              disabled={!termsAccepted}
              onClick={handleAccept}
            >
              <span className="text-button-large-medium text-white">
                {t('trade.oneClick.accept')}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
