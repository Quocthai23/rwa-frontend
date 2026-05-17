'use client';

import React, { useEffect, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { authApi } from '@/services/auth';
import { withdraw } from '@/services/paymentService';
import type { WithdrawPayload } from '@/types/payment';
import { generateUUID } from '@/utils/uuid';
import { useTranslation } from 'react-i18next';

interface Props {
  otpCode: string;
  onChangeOtp: (code: string) => void;
  onResend: () => void;
  resendCountdown: number;
  recipientEmail: string;
  challengeId: string;
  withdrawPayload: Omit<WithdrawPayload, 'idempotencyKey' | 'challengeId'> | null;
  onWithdrawSuccess: () => void;
  onWithdrawError: (error: unknown) => void;
}

export default function WithdrawVerifyOTP({
  otpCode,
  onChangeOtp,
  onResend,
  resendCountdown,
  recipientEmail,
  challengeId,
  withdrawPayload,
  onWithdrawSuccess,
  onWithdrawError,
}: Props) {
  const { t } = useTranslation();
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const [localCode, setLocalCode] = useState(otpCode.padEnd(6, ''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLocalCode(otpCode.padEnd(6, ''));
  }, [otpCode]);

  useEffect(() => {
    return () => {
      onChangeOtp('');
    };
  }, [onChangeOtp]);

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length > 1) return;
    const arr = localCode.split('');
    arr[index] = clean;
    const next = arr.join('');
    setLocalCode(next);
    onChangeOtp(next.trim());
    if (clean && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !localCode[index] && inputsRef.current[index - 1]) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (otpCode.trim().length !== 6 || isSubmitting) return;
    if (!withdrawPayload || !challengeId) {
      onWithdrawError(t('withdraw.verifyOtp.errors.missingWithdrawalData'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify the challenge
      await authApi.verifyAuthChallenge({
        challengeId,
        factor: 'EMAIL_OTP',
        code: otpCode.trim(),
      });

      // 2. Submit the withdrawal
      const payload: WithdrawPayload = {
        ...withdrawPayload,
        challengeId,
        idempotencyKey: generateUUID(),
      };
      await withdraw(payload);
      onWithdrawSuccess();
    } catch (error) {
      const resetCode = ''.padEnd(6, '');
      setLocalCode(resetCode);
      onChangeOtp('');
      inputsRef.current[0]?.focus();
      onWithdrawError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    setLocalCode(''.padEnd(6, ''));
    onChangeOtp('');
    onResend();
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex h-full flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-lg font-semibold">{t('withdraw.verifyOtp.title')}</h2>
        <p className="text-muted-foreground mx-auto mb-4 max-w-80 text-center text-sm">
          {t('withdraw.verifyOtp.description')}
        </p>
        <div className="mb-4 flex justify-between space-x-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Input
              key={i}
              ref={(el) => {
                if (el) inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={localCode[i] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="border-border h-10 w-10 rounded border text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-50 dark:border-neutral-700 dark:bg-neutral-800"
            />
          ))}
        </div>
        <div className="text-muted-foreground mb-4 text-sm">
          {t('withdraw.verifyOtp.didNotReceiveCode')}{' '}
          <button
            type="button"
            className="disabled:text-muted-foreground text-blue-500 hover:underline disabled:cursor-not-allowed"
            onClick={handleResend}
            disabled={resendCountdown > 0}
          >
            {resendCountdown > 0
              ? t('withdraw.verifyOtp.resendIn', { seconds: resendCountdown })
              : t('withdraw.verifyOtp.resend')}
          </button>
        </div>
      </div>
      <Button
        disabled={otpCode.trim().length !== 6 || isSubmitting}
        className="w-full px-3 py-2"
        onClick={handleSubmit}
      >
        {isSubmitting ? t('withdraw.common.processing') : t('withdraw.verifyOtp.continue')}
      </Button>
    </div>
  );
}
