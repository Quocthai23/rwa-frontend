'use client';

import { X } from '@untitledui/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import WithdrawConfirm from '@/components/featured/withdraw/web/components/WithdrawConfirm';
import AssetTransferDetailForm from './AssetTransferDetailForm';
import WithdrawPendingResult from '@/components/featured/withdraw/web/components/WithdrawPendingResult';
import WithdrawRiskConfirm from '@/components/featured/withdraw/web/components/WithdrawRiskConfirm';
import WithdrawVerifyOTP from '@/components/featured/withdraw/web/components/WithdrawVerifyOTP';
import { Sheet, SheetClose, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import type { WithdrawPayload } from '@/types/payment';
import { sanitizeDecimalInput } from '@/utils/decimalInput';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

type AssetDepositFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
};

type FlowStep = 'detail' | 'risk' | 'confirm' | 'otp' | 'success';

const NETWORK_FEE = 0.1;

const AssetDepositFlowSheet = ({ isOpen, onOpenChange, asset }: AssetDepositFlowSheetProps) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const userEmail = useAuthStore((state) => state.user?.email ?? '');

  const [step, setStep] = useState<FlowStep>('detail');
  const [amount, setAmount] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [challengeId, setChallengeId] = useState('');

  const contractAddress = asset?.contractAddress || '0x0000000000000000000000000000000000000000';
  const chainId = '97';

  const availableBalance = useMemo(
    () => parseFloat(selectedAccount?.availableBalance || '0'),
    [selectedAccount?.availableBalance],
  );

  const resetFlow = useCallback(() => {
    setStep('detail');
    setAmount('');
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

  const handleAmountChange = (text: string) => {
    setAmount(
      sanitizeDecimalInput(text, {
        minValue: 0,
        maxDecimalPlaces: 2,
      }),
    );
  };

  const withdrawPayloadBase: Omit<WithdrawPayload, 'idempotencyKey' | 'challengeId'> | null = selectedAccount?.id
    ? {
        accountId: selectedAccount.id,
        amount,
        destinationAddress: contractAddress,
        chainId,
      }
    : null;

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isSendingOtp) return;
    if (!userEmail) {
      showError(t('home.withdrawFailedTitle'), t('withdraw.detail.emailMissing'));
      return;
    }

    try {
      setIsSendingOtp(true);
      const response = await apiClient.post<any>(
        '/api/payment/withdraw',
        {
          purpose: 'WITHDRAW',
          payload: {
            accountId: selectedAccount?.id || '',
            amount,
            destinationAddress: contractAddress,
            chainId,
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
        showSuccess(t('withdraw.detail.otpSentTitle'), t('withdraw.detail.checkEmail'));
      } else {
        throw new Error('MFA challenge failed to initialize');
      }
    } catch (error) {
      showError(t('security.resetPassword.otpSendFailedTitle'), localizeApiError(error, t));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!userEmail) {
      showError(t('home.withdrawFailedTitle'), t('withdraw.detail.emailMissing'));
      return;
    }

    try {
      setIsSendingOtp(true);
      const response = await apiClient.post<any>(
        '/api/payment/withdraw',
        {
          purpose: 'WITHDRAW',
          payload: {
            accountId: selectedAccount?.id || '',
            amount,
            destinationAddress: contractAddress,
            chainId,
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
        showSuccess(t('withdraw.detail.otpSentTitle'), t('withdraw.detail.checkEmail'));
        setStep('otp');
      } else {
        throw new Error('MFA challenge failed to initialize');
      }
    } catch (error) {
      showError(t('security.resetPassword.otpSendFailedTitle'), localizeApiError(error, t));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleWithdrawError = (error: unknown) => {
    const message = localizeApiError(error, t);
    showError(
      t('withdraw.detail.withdrawalFailedTitle'),
      message ||
        t('withdraw.detail.withdrawalFailedMessage') ||
        t('withdraw.common.anErrorOccurred'),
    );
  };

  const amountReceived = Math.max(0, parseFloat(amount || '0') - NETWORK_FEE).toFixed(2);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetFlow();
        }
      }}
    >
      <SheetContent
        side="center"
        className="bg-card w-full max-w-[640px] overflow-y-auto rounded-2xl border p-0 dark:bg-neutral-900"
      >
        <SheetClose className="text-muted-foreground absolute top-5 right-5 z-50 rounded p-1 hover:bg-neutral-100">
          <X size={24} strokeWidth={2} />
        </SheetClose>

        {step === 'detail' ? (
          <AssetTransferDetailForm
            title="Deposit Funds"
            amount={amount}
            availableBalance={availableBalance}
            amountReceived={amountReceived}
            networkFee={NETWORK_FEE}
            onBack={() => onOpenChange(false)}
            onAmountChange={handleAmountChange}
            onSelectMax={() => setAmount(availableBalance.toFixed(2))}
            onSubmit={() => setStep('risk')}
            canSubmit={
              Boolean(amount) &&
              parseFloat(amount) > 0 &&
              parseFloat(amount) <= availableBalance
            }
          />
        ) : null}

        {step === 'risk' ? (
          <WithdrawRiskConfirm
            closeModal={() => setStep('detail')}
            withdrawData={{
              accountId: selectedAccount?.id || '',
              address: contractAddress,
              amount,
              chainId,
            }}
            onContinue={() => setStep('confirm')}
          />
        ) : null}

        {step === 'confirm' ? (
          <WithdrawConfirm
            isPending={isSendingOtp}
            onConfirm={handleRequestOtp}
            withdrawData={{
              accountId: selectedAccount?.id || '',
              address: contractAddress,
              amount,
              chainId,
            }}
          />
        ) : null}

        {step === 'otp' ? (
          <WithdrawVerifyOTP
            otpCode={otpCode}
            onChangeOtp={setOtpCode}
            onResend={handleResendOtp}
            resendCountdown={otpCountdown}
            recipientEmail={userEmail}
            challengeId={challengeId}
            withdrawPayload={withdrawPayloadBase}
            onWithdrawSuccess={() => setStep('success')}
            onWithdrawError={handleWithdrawError}
          />
        ) : null}

        {step === 'success' ? (
          <WithdrawPendingResult
            accountId={selectedAccount?.id || ''}
            address={contractAddress}
            amount={amount}
            networkFee={NETWORK_FEE}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default AssetDepositFlowSheet;
