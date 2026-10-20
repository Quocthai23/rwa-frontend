'use client';

import { useState } from 'react';

import DepositMethod from '@/components/featured/deposit/DepositMethod';
import DepositQR from '@/components/featured/deposit/DepositQR';
import DepositAmountInput from '@/components/featured/deposit/DepositAmountInput';
import DepositPayOsQR from '@/components/featured/deposit/DepositPayOsQR';
import { Sheet, SheetContent, SheetClose } from '@/components/shared/atoms/web/sheet';
import { X } from '@untitledui/icons';
import { useGeneratePayosLink } from '@/hook/payment/useGeneratePayosLink';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { useTranslation } from 'react-i18next';

const DEFAULT_CURRENCY = 'VND';

type DepositFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const DepositFlowSheet = ({ isOpen, onOpenChange }: DepositFlowSheetProps) => {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { t } = useTranslation();
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
      showError(t('topUp.depositUnavailableTitle'), t('topUp.selectReceivingAccount'));
      return;
    }
    generatePayos({ accountId: selectedAccount.id, amount }, {
      onSuccess: (data) => {
        setPayosData(data);
        setStep('payos-qr');
        showSuccess(t('topUp.payosSuccessTitle'), t('topUp.payosSuccessMessage'));
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
      <SheetContent side="center" className="bg-card overflow-y-auto rounded-t-lg">
        <SheetClose className="text-muted-foreground absolute top-8 right-4 z-50 rounded-xs p-0.5">
          <X size={24} strokeWidth={2} />
        </SheetClose>

        <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

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

