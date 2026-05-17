'use client';

import { useRouter } from 'next/navigation';
import { InfoCircle } from '@untitledui/icons';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import WithdrawRiskConfirm from './components/WithdrawRiskConfirm';
import { useAccountStore } from '@/store/useAccountStore';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import WithdrawConfirm from './components/WithdrawConfirm';
import WithdrawVerifyOTP from './components/WithdrawVerifyOTP';
import Header from '@/components/shared/Header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/atoms/tooltip';
import { authApi } from '@/services/auth';
import { useToast } from '@/hook/useToast';
import { useAuthStore } from '@/store/authStore';
import { sanitizeDecimalInput } from '@/utils/decimalInput';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

export default function WithdrawDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useToast();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isOtpSheetOpen, setIsOtpSheetOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [challengeId, setChallengeId] = useState('');

  const chainId = '97'; // bsc testnet

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const userEmail = useAuthStore((state) => state.user?.email ?? '');

  const availableBalance = parseFloat(selectedAccount?.availableBalance || '0');
  const networkFee = 0.1;

  const normalizedAddress = address.trim();
  const isValidEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(normalizedAddress);
  const addressError =
    normalizedAddress && !isValidEvmAddress ? t('withdraw.detail.invalidWalletAddress') : '';

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpCountdown]);

  const getApiErrorCode = (error: unknown): string | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }
    return undefined;
  };

  const isRateLimitOtpError = (error: unknown): boolean => {
    const code = getApiErrorCode(error)?.toLowerCase();
    if (code === 'rate-limit-exceeded') return true;

    const message = localizeApiError(error, t).toLowerCase();
    return (
      message.includes('rate-limit-exceeded') ||
      (message.includes('otp') && message.includes('recently sent'))
    );
  };
  const handleAmountChange = (text: string) => {
    setAmount(
      sanitizeDecimalInput(text, {
        minValue: 0,
        maxDecimalPlaces: 2,
      }),
    );
  };

  const handleShowWithdrawRisk = () => {
    if (!isValidEvmAddress) {
      return;
    }
    setIsSheetOpen(true);
  };

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
            amount,
            destinationAddress: normalizedAddress,
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
            amount,
            destinationAddress: normalizedAddress,
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
        setIsConfirmSheetOpen(false);
        setIsOtpSheetOpen(true);
      } else {
        throw new Error('MFA challenge failed to initialize');
      }
    } catch (error) {
      showError(t('security.resetPassword.otpSendFailedTitle'), localizeApiError(error, t));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleWithdrawSuccess = () => {
    setIsOtpSheetOpen(false);
    const params = new URLSearchParams({
      amount,
      address: normalizedAddress,
      networkFee: networkFee.toString(),
      accountId: selectedAccount?.id || '',
    });
    router.push(`/withdraw/success?${params.toString()}`);
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

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <Header
        label={t('features.withdraw')}
        iconLeftLabel={
          <span className="flex shrink-0 items-center gap-1">
            <Image
              className="h-6 w-6 shrink-0"
              src="/assets/icons/Coin.svg"
              alt={t('withdraw.common.usdt')}
              width={24}
              height={24}
            />
          </span>
        }
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {/* Wallet EVM address */}
          <div className="mb-3 flex items-center">
            <span className="text-body-large-semibold text-foreground mr-1">
              {t('withdraw.detail.walletUsdtAddress')}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="focus-visible:ring-primary-500 text-muted-foreground hover:text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label={t('withdraw.detail.walletAddressHelpAria')}
                >
                  <InfoCircle size={16} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-[min(18rem,calc(100vw-2rem))]"
              >
                <p className="text-left leading-relaxed">
                  <span className="font-semibold">{t('withdraw.detail.walletUsdtAddress')}</span>{' '}
                  {t('withdraw.detail.walletAddressHelpDescription')}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mb-4">
            <Input
              placeholder={t('withdraw.detail.enterWalletAddress')}
              type="text"
              aria-invalid={Boolean(addressError)}
              rightAccessory={
                <Button
                  type="button"
                  variant={'neutral-ghost'}
                  className="bg-muted flex h-9 items-center justify-center p-4 px-3"
                  onClick={async () => {
                    const text = await navigator.clipboard.readText();
                    setAddress(text.trim());
                  }}
                >
                  <span className="text-button-small-medium">{t('withdraw.detail.paste')}</span>
                </Button>
              }
              className="border-border h-13"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {addressError ? (
              <p className="text-body-small-regular mt-2 text-red-500">{addressError}</p>
            ) : null}
          </div>

          {/* Withdrawal amount */}
          <div className="mb-3 flex items-center">
            <span className="text-body-large-semibold text-foreground mr-1">
              {t('withdraw.confirm.withdrawalAmount')}
            </span>
            <span className="text-muted-foreground text-sm"></span>
          </div>
          <div className="mb-4">
            <Input
              placeholder="0"
              type="text"
              inputMode="decimal"
              step="0.01"
              className="border-border h-13"
              rightAccessory={
                <div className="flex items-center">
                  <span className="text-body-large-regular text-foreground">
                    {t('withdraw.common.usd')}
                  </span>
                  <div className="bg-border mx-3 h-6 w-px" />
                  <button
                    type="button"
                    onClick={() => {
                      const maxAmount = availableBalance.toFixed(2);
                      setAmount(maxAmount);
                    }}
                  >
                    <span className="text-primary-500 text-body-large-semibold mr-1">
                      {t('withdraw.detail.max')}
                    </span>
                  </button>
                </div>
              }
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>

          <p className="text-body-large-regular text-muted-foreground">
            {t('withdraw.detail.availableBalance')}{' '}
            <span className="text-body-large-semibold text-foreground">
              {t('withdraw.common.amountWithUsd', { amount: availableBalance })}
            </span>
          </p>
        </div>

        <div className="bg-background shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Fee summary (scrolls with form) */}
          <div className="mb-4">
            <div className="mb-2 flex justify-between">
              <span className="text-body-large-regular text-muted-foreground">Network fee</span>
              <span className="text-button-large-medium">
                {t('withdraw.common.amountWithUsd', { amount: networkFee })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-large-regular text-muted-foreground">
                {t('withdraw.common.amountReceived')}
              </span>
              <span className="text-button-large-medium">
                {t('withdraw.common.amountWithUsd', {
                  amount: Math.max(0, parseFloat(amount || '0') - networkFee).toFixed(2),
                })}
              </span>
            </div>
          </div>
          <Button
            disabled={
              !normalizedAddress ||
              !isValidEvmAddress ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > availableBalance
            }
            className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
            content={t('withdraw.detail.submit')}
            onClick={handleShowWithdrawRisk}
          />
        </div>
      </main>

      {isSheetOpen && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-card h-auto max-h-[90vh] min-h-[65vh] overflow-y-auto"
            showCloseButton={false}
          >
            <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

            <WithdrawRiskConfirm
              closeModal={() => setIsSheetOpen(false)}
              withdrawData={{
                accountId: selectedAccount?.id || '',
                address: normalizedAddress,
                amount,
                chainId,
              }}
              onContinue={() => {
                setIsSheetOpen(false);
                setIsConfirmSheetOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* confirm sheet shown after risk acceptance */}
      {isConfirmSheetOpen && (
        <Sheet open={isConfirmSheetOpen} onOpenChange={setIsConfirmSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-card h-auto max-h-[90vh] min-h-[50%] overflow-y-auto"
            showCloseButton={false}
          >
            <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

            <WithdrawConfirm
              isPending={isSendingOtp}
              onConfirm={handleRequestOtp}
              withdrawData={{
                accountId: selectedAccount?.id || '',
                address: normalizedAddress,
                amount,
                chainId,
              }}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* otp sheet after confirmation */}
      {isOtpSheetOpen && (
        <Sheet open={isOtpSheetOpen} onOpenChange={setIsOtpSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-card h-auto max-h-[90vh] min-h-[40vh] overflow-y-auto p-4"
            showCloseButton={false}
          >
            <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

            <WithdrawVerifyOTP
              otpCode={otpCode}
              onChangeOtp={setOtpCode}
              onResend={handleResendOtp}
              resendCountdown={otpCountdown}
              recipientEmail={userEmail}
              challengeId={challengeId}
              withdrawPayload={{
                amount,
                destinationAddress: normalizedAddress,
                chainId,
              }}
              onWithdrawSuccess={handleWithdrawSuccess}
              onWithdrawError={handleWithdrawError}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
