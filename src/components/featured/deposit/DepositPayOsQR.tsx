'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, Copy01, Check } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

import { useToast } from '@/hook/useToast';
import { Button } from '@/components/shared/atoms/button';

type DepositPayOsQRProps = {
  qrCode: string;
  amount: number;
  orderCode: number;
  checkoutUrl: string;
  onClose: () => void;
};

export default function DepositPayOsQR({ qrCode, amount, orderCode, checkoutUrl, onClose }: DepositPayOsQRProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(qrCode, {
      width: 242,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) setQrImageUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setQrImageUrl(null);
          showError('Không thể tạo mã QR', 'Vui lòng mở trang thanh toán PayOS.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrCode, showError]);

  const copyToClipboard = async (text: string, field: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        return true;
      } catch (error) {
        console.error('Clipboard API failed:', error);
      }
    }
    return false;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleCopyAmount = async () => {
    const success = await copyToClipboard(amount.toString(), 'amount');
    if (success) showSuccess('ThĂ nh cĂ´ng', 'ÄĂ£ sao chĂ©p sá»‘ tiá»n');
  };

  const handleCopyContent = async () => {
    const success = await copyToClipboard(orderCode.toString(), 'content');
    if (success) showSuccess('ThĂ nh cĂ´ng', 'ÄĂ£ sao chĂ©p ná»™i dung chuyá»ƒn khoáº£n');
  };

  const handleOpenCheckout = () => {
    try {
      const target = new URL(checkoutUrl);
      if (target.protocol !== 'https:') throw new Error('Checkout URL must use HTTPS');
      window.location.assign(target.toString());
    } catch {
      showError('Liên kết không hợp lệ', 'Không thể mở trang thanh toán PayOS.');
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
          <p className="text-h3-semibold text-foreground">Thanh toĂ¡n VietQR</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 py-6 overflow-y-auto">
        <p className="text-body-regular text-foreground text-center mb-6">
          Má»Ÿ á»©ng dá»¥ng ngĂ¢n hĂ ng vĂ  <br /> quĂ©t mĂ£ QR bĂªn dÆ°á»›i Ä‘á»ƒ náº¡p tiá»n
        </p>

        <div className="bg-card rounded-xl p-4 shadow-sm mb-6 border border-border">
          {qrImageUrl ? (
            <Image
              src={qrImageUrl}
              alt="VietQR Code"
              width={242}
              height={242}
              unoptimized
            />
          ) : (
            <div className="bg-muted h-[242px] w-[242px] animate-pulse rounded" />
          )}
        </div>

        <div className="w-full flex flex-col gap-4 bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-body-small-regular text-muted-foreground">Sá»‘ tiá»n:</span>
            <div className="flex items-center gap-2">
              <span className="text-body-large-semibold text-primary-500">{formatCurrency(amount)}</span>
              <button onClick={handleCopyAmount}>
                {copiedField === 'amount' ? <Check className="text-green-500" size={18} /> : <Copy01 className="text-foreground" size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-body-small-regular text-muted-foreground">Ná»™i dung chuyá»ƒn khoáº£n:</span>
            <div className="flex items-center gap-2">
              <span className="text-body-medium-semibold text-foreground">{orderCode}</span>
              <button onClick={handleCopyContent}>
                {copiedField === 'content' ? <Check className="text-green-500" size={18} /> : <Copy01 className="text-foreground" size={18} />}
              </button>
            </div>
          </div>
        </div>

        <Button type="button" className="mt-6 w-full" onClick={handleOpenCheckout}>
          Mở trang thanh toán PayOS
        </Button>
      </div>
    </div>
  );
}
