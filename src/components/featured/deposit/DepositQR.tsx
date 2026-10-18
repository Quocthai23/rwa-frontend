'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronLeft, Copy01, Check } from '@untitledui/icons';
import { CHAINS_NAME, TOKEN_NAME } from '@/constants/chain';
import { useToast } from '@/hook/useToast';
import { truncateAddress } from '@/utils/truncateAddress';
import { useTranslation } from 'react-i18next';

type DepositQRProps = {
  address: string;
  currency: string;
  network: string;
  onClose: () => void;
};

function DepositQR({ address, currency, network, onClose }: DepositQRProps) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const qrUrl = useMemo(() => {
    const encoded = encodeURIComponent(address);
    return `https://api.qrserver.com/v1/create-qr-code/?size=242x242&data=${encoded}`;
  }, [address]);

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Clipboard API failed:', error);
      }
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  const handleCopy = async () => {
    if (!address) return;

    const success = await copyToClipboard(address);
    if (success) {
      showSuccess(t('topUp.copySuccessTitle'), t('topUp.copySuccessMessage'));
      setIsCopied(true);
      // Reset icon after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!address) return;
    const message = t('topUp.walletShareMessage', { currency, network, address });

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Share failed:', error);
          if (error.name === 'AbortError' || error.message?.includes('abort')) return;
        }
      }

      const isCopied = await copyToClipboard(message);
      if (isCopied) {
        showSuccess(t('topUp.shareSuccessTitle'), t('topUp.shareSuccessMessage'));
      }
    }
  };

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="relative flex h-14 w-full items-center justify-center px-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute left-4"
        >
          <ChevronLeft className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/assets/images/banner-deposit.svg"
            alt="deposit banner"
            width={28}
            height={28}
          />
          <p className="text-h3-semibold text-foreground">{t('deposit.title')}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-body-regular text-foreground mb-4">
          {t('topUp.minDepositPrefix')}{' '}
          <span className="font-semibold">{t('topUp.minDepositAmount')}</span>
        </p>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <Image src={qrUrl} alt={t('topUp.depositQrAlt')} width={242} height={242} />
        </div>

        <div className="bg-muted text-foreground mt-4 flex h-10 w-fit items-center justify-center gap-2 rounded px-3">
          <span className="text-body-small-semibold">{truncateAddress(address)}</span>
          <button type="button" onClick={handleCopy} aria-label={t('topUp.copyAddressAria')}>
            {isCopied ? (
              <Check className="text-green-500" size={20} strokeWidth={2.5} />
            ) : (
              <Copy01 className="text-foreground" size={20} strokeWidth={2} />
            )}
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <p className="text-button-large-semibold text-foreground text-center">
            {t('topUp.sendOnlyPrefix')}{' '}
            <span className="text-error-500 text-red-500">
              {CHAINS_NAME?.[Number(network) ?? '']} ({TOKEN_NAME?.[Number(network) ?? '']})
            </span>
            {t('topUp.networkSuffix') ? ` ${t('topUp.networkSuffix')}` : ''}
          </p>
          <p className="text-body-small-medium text-muted-foreground mt-1">
            {t('topUp.fundsWarning')}
          </p>
        </div>
      </div>

      <div className="mb-1 flex h-14 w-full items-center gap-4 px-4">
        <button
          type="button"
          onClick={handleCopy}
          className="text-button-medium border-border bg-muted text-foreground flex-1 rounded border py-3"
        >
          {t('topUp.copyAddress')}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="text-button-medium border-border bg-muted text-foreground flex-1 rounded border py-3"
        >
          {t('topUp.share')}
        </button>
      </div>
    </div>
  );
}

export default DepositQR;

