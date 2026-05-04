'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { authApi } from '@/services/auth';
import type { TransferPayload } from '@/types/payment';
import { generateUUID } from '@/utils/uuid';
import { useTranslation } from 'react-i18next';

interface TransferVerifyOTPProps {
  otpCode: string;
  onChangeOtp: (code: string) => void;
  onResend: () => void;
  resendCountdown: number;
  recipientEmail: string;
  transferPayload: Omit<TransferPayload, 'idempotencyKey'> | null;
  onTransferSuccess: () => void;
  onTransferError: (error: unknown) => void;
}

export default function TransferVerifyOTP({
  otpCode,
  onChangeOtp,
  onResend,
  resendCountdown,
  recipientEmail,
  transferPayload,
  onTransferSuccess,
  onTransferError,
}: TransferVerifyOTPProps) {
  const { t } = useTranslation();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [localCode, setLocalCode] = useState<string[]>(Array(6).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const normalized = otpCode
      .replace(/[^0-9]/g, '')
      .slice(0, 6)
      .split('');
    setLocalCode([...normalized, ...Array(6 - normalized.length).fill('')]);
  }, [otpCode]);

  // Reset stale OTP whenever verification screen opens again.
  useEffect(() => {
    setLocalCode(Array(6).fill(''));
    onChangeOtp('');
    inputsRef.current[0]?.focus();
  }, [onChangeOtp]);

  const handleChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/[^0-9]/g, '');
    if (!clean) {
      const next = [...localCode];
      next[index] = '';
      setLocalCode(next);
      onChangeOtp(next.join(''));
      return;
    }

    const next = [...localCode];
    next[index] = clean[clean.length - 1];
    setLocalCode(next);
    onChangeOtp(next.join(''));

    if (inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);
    if (!pasted) return;

    const next = [...Array(6)].map((_, idx) => pasted[idx] || '');
    setLocalCode(next);
    onChangeOtp(next.join(''));

    const lastIndex = Math.min(pasted.length, 6) - 1;
    if (lastIndex >= 0) {
      inputsRef.current[lastIndex]?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace') {
      if (localCode[index]) {
        const next = [...localCode];
        next[index] = '';
        setLocalCode(next);
        onChangeOtp(next.join(''));
        return;
      }
      if (inputsRef.current[index - 1]) {
        const prevIndex = index - 1;
        const next = [...localCode];
        next[prevIndex] = '';
        setLocalCode(next);
        onChangeOtp(next.join(''));
        inputsRef.current[prevIndex]?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (otpCode.trim().length !== 6 || isSubmitting) {
      return;
    }

    if (!recipientEmail || !transferPayload) {
      onTransferError(t('transfer.verifyOtp.errors.missingTransferData'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.verifyOTP(recipientEmail, otpCode.trim(), 'transfer');
      if (!response.token) {
        onTransferError(t('transfer.verifyOtp.errors.invalidOtp'));
        return;
      }
      const payload: TransferPayload = {
        ...transferPayload,
        otpToken: response.token,
        idempotencyKey: generateUUID(),
      };
      await authApi.transfer(payload);
      onTransferSuccess();
    } catch (error) {
      onTransferError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex h-full flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-lg font-semibold">{t('transfer.verifyOtp.title')}</h2>
        <p className="text-muted-foreground mb-4 max-w-sm text-center text-sm">
          {t('transfer.verifyOtp.description')}
        </p>
        <div className="mb-4 flex justify-between gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={localCode[index] || ''}
              onChange={(event) => handleChange(index, event.target.value)}
              onPaste={handlePaste}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="border-border h-10 w-10 rounded border text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-50 dark:border-neutral-700 dark:bg-neutral-800"
            />
          ))}
        </div>
        <div className="text-muted-foreground mb-4 text-sm">
          {t('transfer.verifyOtp.didNotReceiveCode')}{' '}
          <button
            type="button"
            className="disabled:text-muted-foreground text-blue-500 hover:underline disabled:cursor-not-allowed"
            onClick={onResend}
            disabled={resendCountdown > 0}
          >
            {resendCountdown > 0
              ? t('transfer.verifyOtp.resendIn', { seconds: resendCountdown })
              : t('transfer.verifyOtp.resend')}
          </button>
        </div>
      </div>
      <Button
        disabled={otpCode.trim().length !== 6 || isSubmitting}
        className="w-full px-3 py-2"
        onClick={handleSubmit}
      >
        {isSubmitting ? t('transfer.verifyOtp.processing') : t('transfer.verifyOtp.continue')}
      </Button>
    </div>
  );
}
