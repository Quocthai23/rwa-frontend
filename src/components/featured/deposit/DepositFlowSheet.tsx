'use client';

import { useState } from 'react';

import DepositMethod from '@/components/featured/deposit/DepositMethod';
import DepositQR from '@/components/featured/deposit/DepositQR';
import DepositAmountInput from '@/components/featured/deposit/DepositAmountInput';
import DepositPayOsQR from '@/components/featured/deposit/DepositPayOsQR';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useGeneratePayosLink } from '@/hook/payment/useGeneratePayosLink';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';

const DEFAULT_CURRENCY = 'VNDT';

type DepositFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const DepositFlowSheet = ({ isOpen, onOpenChange }: DepositFlowSheetProps) => {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const [step, setStep] = useState<'method' | 'qr' | 'payos-amount' | 'payos-qr'>('method');
  const [qrAddress, setQrAddress] = useState('');
  const [qrNetwork, setQrNetwork] = useState('');
  const [payosData, setPayosData] = useState<{qrCode: string; amount: number; orderCode: number; checkoutUrl: string} | null>(null);

  const { isPending: isGeneratingPayos, mutate: generatePayos } = useGeneratePayosLink();

  const { showError, showSuccess } = useToast();

  const handleOpenQr = (address: string, network: string) => {
    setQrAddress(address);
    setQrNetwork(network);
    setStep('qr');
  };

  const handleOpenPayosAmount = () => {
    setStep('payos-amount');
  };

  const handlePayosAmountSubmit = (amount: number) => {
    if (!selectedAccount?.id) {
      showError('Không thể nạp tiền', 'Vui lòng chọn tài khoản nhận tiền.');
      return;
    }
    generatePayos({ accountId: selectedAccount.id, amount }, {
      onSuccess: (data) => {
        setPayosData(data);
        setStep('payos-qr');
        showSuccess('ThĂ nh cĂ´ng', 'ÄĂ£ táº¡o mĂ£ QR thanh toĂ¡n PayOS');
      }
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setStep('method');
          setQrAddress('');
          setQrNetwork('');
          setPayosData(null);
        }
      }}
    >
      <SheetContent
        side="center"
        className="bg-card h-[93%] overflow-y-auto rounded-t-lg dark:bg-neutral-900"
        showCloseButton={false}
      >
        <div className="bg-muted dark:neutral-900 mx-auto mt-2 h-1 w-11 rounded" />

        {step === 'method' && <DepositMethod onOpenQr={handleOpenQr} onOpenPayos={handleOpenPayosAmount} />}
        {step === 'qr' && (
          <DepositQR
            address={qrAddress}
            currency={DEFAULT_CURRENCY}
            network={qrNetwork}
            onClose={() => setStep('method')}
          />
        )}
        {step === 'payos-amount' && (
          <DepositAmountInput
            onClose={() => setStep('method')}
            onSubmit={handlePayosAmountSubmit}
            isPending={isGeneratingPayos}
          />
        )}
        {step === 'payos-qr' && payosData && (
          <DepositPayOsQR
            {...payosData}
            onClose={() => setStep('method')}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DepositFlowSheet;

