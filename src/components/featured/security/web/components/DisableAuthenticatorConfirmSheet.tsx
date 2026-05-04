import { AlertTriangle } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Checkbox } from '@/components/shared/atoms/checkbox';
import { Sheet, SheetContent, SheetFooter } from '@/components/shared/atoms/web/sheet';

import { SheetTopBar } from './SheetTopBar';

type Translate = (key: string, options?: Record<string, unknown>) => string;

type DisableAuthenticatorConfirmSheetProps = {
  open: boolean;
  setIsDisableConfirmOpen: (open: boolean) => void;
  disableNoticeAccepted: boolean;
  setDisableNoticeAccepted: (value: boolean) => void;
  disableSecurityRiskAccepted: boolean;
  setDisableSecurityRiskAccepted: (value: boolean) => void;
  isRemovingAuthenticator: boolean;
  canConfirmDisable: boolean;
  handleDisableAuthenticator: () => void;
  t: Translate;
};

export function DisableAuthenticatorConfirmSheet({
  open,
  setIsDisableConfirmOpen,
  disableNoticeAccepted,
  setDisableNoticeAccepted,
  disableSecurityRiskAccepted,
  setDisableSecurityRiskAccepted,
  isRemovingAuthenticator,
  canConfirmDisable,
  handleDisableAuthenticator,
  t,
}: DisableAuthenticatorConfirmSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => setIsDisableConfirmOpen(nextOpen)}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border p-0"
        showCloseButton={false}
        title={t('security.authenticatorApp.removeSheet.title', {
          defaultValue: 'Are you sure you want to remove the Authenticator App?',
        })}
      >
        <SheetTopBar
          title={t('security.authenticatorApp.removeSheet.title', {
            defaultValue: 'Are you sure you want to remove the Authenticator App?',
          })}
          onClose={() => setIsDisableConfirmOpen(false)}
        />

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-center py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="text-red-500" size={28} />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={disableNoticeAccepted}
              onCheckedChange={(checked) => setDisableNoticeAccepted(checked === true)}
              className="data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 mt-0.5 size-5 data-[state=checked]:text-white"
            />
            <span className="text-body-large-medium text-foreground">
              {t('security.authenticatorApp.removeSheet.noticeWithdrawal', {
                defaultValue:
                  'To ensure account safety, withdrawals may be disabled for 24 hours after removing the authenticator app.',
              })}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={disableSecurityRiskAccepted}
              onCheckedChange={(checked) => setDisableSecurityRiskAccepted(checked === true)}
              className="data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 mt-0.5 size-5 data-[state=checked]:text-white"
            />
            <span className="text-body-large-medium text-foreground">
              {t('security.authenticatorApp.removeSheet.noticeSecurityRisk', {
                defaultValue:
                  'Two-factor authentication is required for withdrawals and other secure actions. Using only one verification method increases the risk to your account.',
              })}
            </span>
          </label>

          <SheetFooter className="p-0 pt-2">
            <div className="flex w-full gap-2">
              <Button
                variant="neutral-outline"
                className="flex-1 rounded py-3"
                onClick={() => setIsDisableConfirmOpen(false)}
                disabled={isRemovingAuthenticator}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                variant="primary-contained"
                className="flex-1 rounded py-3"
                onClick={handleDisableAuthenticator}
                disabled={!canConfirmDisable}
              >
                {isRemovingAuthenticator
                  ? t('security.authenticatorApp.actions.processing', {
                      defaultValue: 'Processing...',
                    })
                  : t('common.confirm', { defaultValue: 'Confirm' })}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
