'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check } from '@untitledui/icons';
import TransferConfirm from './components/TransferConfirm';
import TransferVerifyOTP from './components/TransferVerifyOTP';
import { Button } from '@/components/shared/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Input } from '@/components/shared/atoms/input';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import Header from '@/components/shared/Header';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import { formatPriceDecimal } from '@/utils/currency';
import { sanitizeDecimalInput } from '@/utils/decimalInput';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAccounts } from '@/hook/useAccount';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Transfer() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const { refetch: refetchAccounts } = useAccounts();

  const reasonOptions = [
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
  ];

  const selectedAccount = useAccountStore((state) => state.selectedAccount) ?? undefined;

  const fromAccountId = selectedAccount?.id || '';
  const balanceNum = Number(selectedAccount?.availableBalance);
  const displayBalance = Number.isFinite(balanceNum) ? balanceNum : 0;
  const [recipientEmail, setRecipientEmail] = useState('');
  const [reason, setReason] = useState(reasonOptions[0].value);
  const selectedReasonLabel =
    reasonOptions.find((option) => option.value === reason)?.label ?? reasonOptions[0].label;

  const [amount, setAmount] = useState('10');

  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isOtpSheetOpen, setIsOtpSheetOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [challengeId, setChallengeId] = useState('');

  useEffect(() => {
    if (otpCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCountdown]);

  const validateTransfer = () => {
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
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isSendingOtp) {
      return;
    }

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
  };

  const handleRequestOtp = async () => {
    if (!validateTransfer()) {
      return;
    }

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
        setIsConfirmSheetOpen(false);
        setIsOtpSheetOpen(true);
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
  };

  const handleContinue = () => {
    if (!validateTransfer()) {
      return;
    }

    setIsConfirmSheetOpen(true);
  };

  const handleTransferSuccess = () => {
    showSuccess(
      t('transfer.form.transferSuccessfulTitle'),
      t('transfer.form.transferSuccessfulMessage', { amount }),
    );
    setIsOtpSheetOpen(false);
    refetchAccounts();
    router.push('/');
  };

  const handleTransferError = (error: unknown) => {
    showError(
      t('transfer.form.transferFailedTitle', t('home.transferFailedTitle')),
      localizeApiError(error, t, 'transfer.form.transferFailed'),
    );
  };

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
    <div className="bg-background flex min-h-screen flex-col">
      <Header label={t('features.transfer') ?? 'Transfer'} onBack={() => router.back()} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full flex-col gap-6 p-4">
          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('transfer.form.fromAccountLabel', 'From account')}
            </label>
            <Input readOnly className="h-12" value={selectedAccount?.id || ''} />

            <div className="mt-2 flex items-center gap-1">
              <span className="text-body-large-regular text-primary-500">
                {t('account.balance', 'Balance')}:{' '}
              </span>
              <span className="text-body-large-regular text-primary-500">
                {formatPriceDecimal(displayBalance)} USD
              </span>
            </div>
          </div>

          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
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
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('transfer.form.transferReasonLabel', 'Transfer reason')}
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="border-border bg-card flex h-12 w-full items-center justify-between rounded border px-3"
                >
                  <span className="text-body-large-regular text-foreground">
                    {selectedReasonLabel}
                  </span>
                  <ChevronDown size={24} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-border bg-card w-(--radix-dropdown-menu-trigger-width) border">
                {reasonOptions.map((option) => {
                  const isActive = option.value === reason;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      className={`text-body-large-regular flex cursor-pointer items-center justify-between text-base ${
                        isActive ? 'text-primary-500' : 'text-foreground'
                      }`}
                      onSelect={() => setReason(option.value)}
                    >
                      <span className="pr-3">{option.label}</span>
                      {isActive && <Check size={24} color={colors.primary500} />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-body-small-regular text-muted-foreground mt-2">
              {t(
                'transfer.form.verifyRecipientHint',
                "We'll verify it matches the recipient's account before processing the transfer.",
              )}
            </p>
          </div>

          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('transfer.form.amountLabel', 'Amount')}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={t('transfer.form.enterAmountPlaceholder', 'Enter amount')}
              className="text-body-large-regular border-border h-12 border"
              value={amount}
              onChange={(event) => {
                const nextAmount = sanitizeDecimalInput(event.target.value, {
                  minValue: 0,
                  maxValue: Number.isFinite(displayBalance) ? displayBalance : undefined,
                });
                setAmount(nextAmount);
              }}
              rightAccessory={<span className="text-body-large-regular text-foreground">USD</span>}
            />
            <div className="text-body-large-regular text-primary-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {t('transfer.form.balanceRangeHint', '5 - {{balance}} USD', {
                  balance: displayBalance.toFixed(2),
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-16 p-4">
        <Button
          type="button"
          disabled={isContinueDisabled}
          className={`text-button-large-medium w-full py-3 text-white ${
            isContinueDisabled ? 'bg-neutral-300' : 'bg-primary-500'
          }`}
          onClick={handleContinue}
        >
          {isSendingOtp
            ? t('transfer.form.processing', 'Processing...')
            : t('transfer.form.continue', 'Continue')}
        </Button>
      </div>

      {isConfirmSheetOpen && (
        <Sheet open={isConfirmSheetOpen} onOpenChange={setIsConfirmSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-card h-auto max-h-[90vh] min-h-[45vh] overflow-y-auto"
            title={t('transfer.confirm.title', 'Transfer confirmation')}
            showCloseButton={false}
          >
            <div className="mx-auto mt-2 h-1 w-11 rounded" />
            <TransferConfirm
              data={{
                amount,
                fromAccountName: selectedAccount?.name,
                recipientEmail,
                reason,
              }}
              isPending={isSendingOtp}
              onConfirm={handleRequestOtp}
            />
          </SheetContent>
        </Sheet>
      )}

      {isOtpSheetOpen && (
        <Sheet open={isOtpSheetOpen} onOpenChange={setIsOtpSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-card h-auto max-h-[90vh] min-h-[45vh] overflow-y-auto p-4"
            title={t('transfer.verifyOtp.title', 'Verify transfer OTP')}
            showCloseButton={false}
          >
            <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />
            <TransferVerifyOTP
              otpCode={otpCode}
              onChangeOtp={setOtpCode}
              onResend={handleResendOtp}
              resendCountdown={otpCountdown}
              recipientEmail={recipientEmail}
              challengeId={challengeId}
              transferPayload={{
                accountId: fromAccountId,
                amount,
                toEmail: recipientEmail,
              }}
              onTransferSuccess={handleTransferSuccess}
              onTransferError={handleTransferError}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
