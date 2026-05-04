import { AlertTriangle } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';

import { SheetTopBar } from './SheetTopBar';

type Translate = (key: string, options?: Record<string, unknown>) => string;

type DeleteAccountSheetProps = {
  open: boolean;
  setIsDeleteSheetOpen: (open: boolean) => void;
  closeDeleteSheet: () => void;
  isDeletingAccount: boolean;
  handleDeleteAccount: () => void;
  t: Translate;
};

export function DeleteAccountSheet({
  open,
  setIsDeleteSheetOpen,
  closeDeleteSheet,
  isDeletingAccount,
  handleDeleteAccount,
  t,
}: DeleteAccountSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setIsDeleteSheetOpen(true) : closeDeleteSheet())}
    >
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border p-0"
        showCloseButton={false}
        title={t('security.deleteAccount.title', { defaultValue: 'Delete account' })}
      >
        <SheetTopBar
          title={t('security.deleteAccount.title', { defaultValue: 'Delete account' })}
          onClose={closeDeleteSheet}
        />

        <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
          <div className="mt-2 mb-6 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="text-red-500" size={28} />
            </div>
          </div>

          <h1 className="text-h3-semibold text-foreground mb-6 text-center">
            {t('security.deleteAccount.confirmTitle', { defaultValue: 'Delete your account?' })}
          </h1>

          <p className="text-body-large-regular text-foreground mb-4 self-stretch">
            {t('security.deleteAccount.description', {
              defaultValue:
                'If you no longer wish to use this account, you can request to permanently delete it. Please note that this action is irreversible.',
            })}
          </p>

          <p className="text-body-large-regular text-foreground mb-3">
            {t('security.deleteAccount.consequencesIntro', {
              defaultValue: 'Deleting will result in the following:',
            })}
          </p>

          <ul className="mb-4 ml-5 list-disc space-y-2">
            <li className="text-body-large-regular text-foreground">
              <span className="text-body-large-semibold text-foreground">
                {t('security.deleteAccount.consequences.assetLoss.title', {
                  defaultValue: 'Asset Loss',
                })}
                :
              </span>{' '}
              <span>
                {t('security.deleteAccount.consequences.assetLoss.description', {
                  defaultValue:
                    'All remaining balances will be permanently lost and unrecoverable.',
                })}
              </span>
            </li>
            <li className="text-body-large-regular text-foreground">
              <span className="text-body-large-semibold text-foreground">
                {t('security.deleteAccount.consequences.serviceTermination.title', {
                  defaultValue: 'Service Termination',
                })}
                :
              </span>{' '}
              <span>
                {t('security.deleteAccount.consequences.serviceTermination.description', {
                  defaultValue:
                    'All active trades, orders, and subscriptions will be cancelled immediately.',
                })}
              </span>
            </li>
            <li className="text-body-large-regular text-foreground">
              <span className="text-body-large-semibold text-foreground">
                {t('security.deleteAccount.consequences.dataRemoval.title', {
                  defaultValue: 'Data Removal',
                })}
                :
              </span>{' '}
              <span>
                {t('security.deleteAccount.consequences.dataRemoval.description', {
                  defaultValue:
                    'Your personal info and history will be deleted (except as required by law).',
                })}
              </span>
            </li>
            <li className="text-body-large-regular text-foreground">
              <span className="text-body-large-semibold text-foreground">
                {t('security.deleteAccount.consequences.forfeiture.title', {
                  defaultValue: 'Forfeiture',
                })}
                :
              </span>{' '}
              <span>
                {t('security.deleteAccount.consequences.forfeiture.description', {
                  defaultValue: 'All unused vouchers, rewards, and points will be cleared.',
                })}
              </span>
            </li>
          </ul>

          <div className="mt-auto flex justify-center pt-4">
            <Button
              type="button"
              variant="red-contained"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
              className="text-button-large-medium w-full rounded px-4 py-3 font-medium"
            >
              {isDeletingAccount
                ? t('security.deleteAccount.deleting', { defaultValue: 'Deleting...' })
                : t('security.deleteAccount.deleteButton', {
                    defaultValue: 'Delete account',
                  })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
