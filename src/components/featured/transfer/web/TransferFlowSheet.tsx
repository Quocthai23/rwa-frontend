'use client';

import { Check, ChevronDown, X } from '@untitledui/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TransferConfirm from '@/components/featured/transfer/components/TransferConfirm';
import TransferVerifyOTP from '@/components/featured/transfer/components/TransferVerifyOTP';
import { Button } from '@/components/shared/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Input } from '@/components/shared/atoms/input';
import { Sheet, SheetClose, SheetContent } from '@/components/shared/atoms/web/sheet';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useAccounts } from '@/hook/useAccount';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { authApi } from '@/services/auth';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import type { TransferPayload } from '@/types/payment';
import { sanitizeDecimalInput } from '@/utils/decimalInput';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

type TransferFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type FlowStep = 'form' | 'confirm' | 'otp';

const OTP_LENGTH = 6;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function TransferFlowSheet({ isOpen, onOpenChange }: TransferFlowSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const { refetch: refetchAccounts } = useAccounts();

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const fromAccountId = selectedAccount?.id || '';

  const balanceNum = Number(selectedAccount?.availableBalance);
  const displayBalance = Number.isFinite(balanceNum) ? balanceNum : 0;

  const [step, setStep] = useState<FlowStep>('form');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('Margin support');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [challengeId, setChallengeId] = useState('');

  const reasonOptions = useMemo(
    () => [
      {
        label: t('transfer.form.reasons.marginSupport', 'Margin support'),
        value: 'Margin support',
      },
      {
        label: t('transfer.form.reasons.balanceAdjustment', 'Balance adjustment'),
        value: 'Balance adjustment',
      },
      {
        label: t('transfer.form.reasons.feeOrRebate', 'Fee or rebate'),
        value: 'Fee or rebate',
      },
      {
        label: t('transfer.form.reasons.bonusOrPromotion', 'Bonus or promotion'),
        value: 'Bonus or promotion',
      },
      {
        label: t('transfer.form.reasons.compensation', 'Compensation'),
        value: 'Compensation',
      },
    ],
    [t],
  );

  const selectedReasonLabel =
    reasonOptions.find((option) => option.value === reason)?.label ?? reasonOptions[0]?.label ?? '';

  const resetFlow = useCallback(() => {
    setStep('form');
    setRecipientEmail('');
    setAmount('10');
    setReason('Margin support');
    setOtpCode('');
    setOtpCountdown(0);
    setIsSendingOtp(false);
    setChallengeId('');
  }, []);

  useEffect(() => {
    if (otpCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCountdown]);

  const validateTransfer = useCallback(() => {
    if (!fromAccountId) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('transfer.form.selectFromAccount'),
      );
      return false;
    }

    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('home.transferDemoError'),
      );
      return false;
    }

    const trimmedRecipientEmail = recipientEmail.trim();
    if (!trimmedRecipientEmail) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('transfer.form.enterRecipientEmail'),
      );
      return false;
    }

    if (!isValidEmail(trimmedRecipientEmail)) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('transfer.form.enterValidEmail'),
      );
      return false;
    }

    if (!reason) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('transfer.form.selectTransferReason'),
      );
      return false;
    }

    const transferAmount = Number.parseFloat(amount);
    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('transfer.form.enterValidAmount'),
      );
      return false;
    }

    if (displayBalance <= 0) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('apiErrors.insufficientBalance'),
      );
      return false;
    }

    if (Number.isFinite(displayBalance) && transferAmount > displayBalance) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        t('apiErrors.insufficientBalance'),
      );
      return false;
    }

    return true;
  }, [
    amount,
    displayBalance,
    fromAccountId,
    recipientEmail,
    reason,
    selectedAccount,
    showError,
    t,
  ]);

  const handleResendOtp = useCallback(async () => {
    if (otpCountdown > 0 || isSendingOtp) return;

    try {
      setIsSendingOtp(true);
      const response = await apiClient.post<any>(
        '/api/payment/transfer',
        {
          purpose: 'TRANSFER',
          payload: {
            accountId: fromAccountId,
            amount,
            toEmail: recipientEmail.trim(),
          },
        },
        {
          baseUrl: CLIENT_BASE_URL,
          skipAuth: false,
        },
      );

      if (response && response.status === 'challenge_required') {
        setChallengeId(response.challengeId);
        setOtpCountdown(60);
        showSuccess(t('transfer.form.otpSentTitle'), t('transfer.form.otpSentMessage'));
      } else {
        throw new Error('MFA challenge failed to initialize');
      }
    } catch (error) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        localizeApiError(error, t),
      );
    } finally {
      setIsSendingOtp(false);
    }
  }, [amount, isSendingOtp, otpCountdown, recipientEmail, showError, showSuccess, t]);

  const handleRequestOtp = useCallback(async () => {
    if (!validateTransfer()) return;

    try {
      setIsSendingOtp(true);
      const response = await apiClient.post<any>(
        '/api/payment/transfer',
        {
          purpose: 'TRANSFER',
          payload: {
            accountId: fromAccountId,
            amount,
            toEmail: recipientEmail.trim(),
          },
        },
        {
          baseUrl: CLIENT_BASE_URL,
          skipAuth: false,
        },
      );

      if (response && response.status === 'challenge_required') {
        setChallengeId(response.challengeId);
        setOtpCountdown(60);
        showSuccess(t('transfer.form.otpSentTitle'), t('transfer.form.otpSentMessage'));
        setStep('otp');
      } else {
        throw new Error('MFA challenge failed to initialize');
      }
    } catch (error) {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        localizeApiError(error, t),
      );
    } finally {
      setIsSendingOtp(false);
    }
  }, [amount, recipientEmail, showError, showSuccess, t, validateTransfer]);

  const handleTransferSuccess = useCallback(() => {
    showSuccess(
      t('transfer.form.transferSuccessfulTitle'),
      t('transfer.form.transferSuccessfulMessage', { amount }),
    );
    refetchAccounts();
    onOpenChange(false);
    resetFlow();
  }, [amount, onOpenChange, refetchAccounts, resetFlow, showSuccess, t]);

  const handleTransferError = useCallback(
    (error: unknown) => {
      showError(
        t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
        localizeApiError(error, t, 'transfer.form.transferFailed'),
      );
    },
    [showError, t],
  );

  const transferPayload: Omit<TransferPayload, 'idempotencyKey' | 'challengeId'> | null =
    fromAccountId
      ? {
          accountId: fromAccountId,
          amount,
          toEmail: recipientEmail.trim(),
        }
      : null;

  const transferAmount = Number.parseFloat(amount);
  const trimmedRecipientEmail = recipientEmail.trim();
  const hasBalance = displayBalance > 0;
  const isAmountValid = !Number.isNaN(transferAmount) && transferAmount > 0;
  const isWithinBalance = !Number.isFinite(displayBalance) || transferAmount <= displayBalance;
  const isContinueDisabled =
    isSendingOtp ||
    !hasBalance ||
    !fromAccountId ||
    selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO ||
    !trimmedRecipientEmail ||
    !isValidEmail(trimmedRecipientEmail) ||
    !reason ||
    !isAmountValid ||
    !isWithinBalance;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetFlow();
      }}
    >
      <SheetContent
        side="center"
        className="bg-card scrollbar-neutral-slim my-2 w-full max-w-160 overflow-y-auto rounded-2xl border p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:max-h-[calc(100dvh-1rem)] sm:my-6 sm:max-h-[calc(100dvh-4rem)] dark:bg-neutral-900"
      >
        <SheetClose className="text-muted-foreground absolute top-5 right-5 z-50 rounded p-1 hover:bg-neutral-100">
          <X size={24} strokeWidth={2} />
        </SheetClose>

        {step === 'form' ? (
          <div className="px-6 py-5">
            <h2 className="text-body-large-semibold text-foreground mb-4">
              {t('features.transfer', 'Transfer')}
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-body-small-medium text-foreground mb-2 block">
                  {t('transfer.form.fromAccountLabel', 'From account')}
                </label>
                <Input readOnly className="h-12" value={selectedAccount?.id || ''} />
                <p className="text-body-small-regular text-primary-500 mt-2">
                  {t('account.balance', 'Balance')}: {displayBalance.toFixed(2)} USD
                </p>
              </div>

              <div>
                <label className="text-body-small-medium text-foreground mb-2 block">
                  {t('transfer.form.recipientEmailLabel', 'Recipient email (for verification)')}
                </label>
                <Input
                  type="email"
                  placeholder={t('transfer.form.recipientEmailPlaceholder', 'Email')}
                  className="h-12"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                />
              </div>

              <div>
                <label className="text-body-small-medium text-foreground mb-2 block">
                  {t('transfer.form.transferReasonLabel', 'Transfer reason')}
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="border-border bg-background flex h-12 w-full items-center justify-between rounded border px-3"
                    >
                      <span className="text-body-small-regular text-foreground">
                        {selectedReasonLabel}
                      </span>
                      <ChevronDown size={20} className="text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="border-border bg-card w-(--radix-dropdown-menu-trigger-width) border">
                    {reasonOptions.map((option) => {
                      const isActive = option.value === reason;
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          className={isActive ? 'text-primary-500' : 'text-foreground'}
                          onSelect={() => setReason(option.value)}
                        >
                          <span className="pr-3">{option.label}</span>
                          {isActive ? <Check size={18} color={colors.primary500} /> : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <label className="text-body-small-medium text-foreground mb-2 block">
                  {t('transfer.form.amountLabel', 'Amount')}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('transfer.form.enterAmountPlaceholder', 'Enter amount')}
                  className="h-12"
                  value={amount}
                  onChange={(event) => {
                    const nextAmount = sanitizeDecimalInput(event.target.value, {
                      minValue: 0,
                      maxValue: Number.isFinite(displayBalance) ? displayBalance : undefined,
                    });
                    setAmount(nextAmount);
                  }}
                  rightAccessory={
                    <span className="text-body-small-regular text-foreground pr-1">USD</span>
                  }
                />
              </div>

              <Button
                type="button"
                disabled={isContinueDisabled}
                variant="primary-contained"
                className="h-11 w-full"
                onClick={() => {
                  if (!validateTransfer()) return;
                  setStep('confirm');
                }}
              >
                {t('common.continue', 'Continue')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'confirm' ? (
          <TransferConfirm
            data={{
              amount,
              fromAccountName: selectedAccount?.id || '',
              recipientEmail: recipientEmail.trim(),
              reason,
            }}
            isPending={isSendingOtp}
            onConfirm={handleRequestOtp}
          />
        ) : null}

        {step === 'otp' ? (
          <div className="px-6 py-5">
            <TransferVerifyOTP
              otpCode={otpCode}
              onChangeOtp={setOtpCode}
              onResend={handleResendOtp}
              resendCountdown={otpCountdown}
              recipientEmail={recipientEmail.trim()}
              challengeId={challengeId}
              transferPayload={transferPayload}
              onTransferSuccess={handleTransferSuccess}
              onTransferError={handleTransferError}
            />
            <Button
              type="button"
              variant="neutral-outline"
              className="mt-4 h-11 w-full"
              onClick={() => setStep('confirm')}
            >
              {t('common.back', 'Back')}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
