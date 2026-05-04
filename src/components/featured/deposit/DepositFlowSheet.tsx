'use client';

import { useState } from 'react';

import DepositMethod from '@/components/featured/deposit/DepositMethod';
import DepositQR from '@/components/featured/deposit/DepositQR';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';

const DEFAULT_CURRENCY = 'USDT';

type DepositFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const DepositFlowSheet = ({ isOpen, onOpenChange }: DepositFlowSheetProps) => {
  const [step, setStep] = useState<'method' | 'qr'>('method');
  const [qrAddress, setQrAddress] = useState('');
  const [qrNetwork, setQrNetwork] = useState('');

  const handleOpenQr = (address: string, network: string) => {
    setQrAddress(address);
    setQrNetwork(network);
    setStep('qr');
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
        }
      }}
    >
      <SheetContent
        side="center"
        className="bg-card h-[93%] overflow-y-auto rounded-t-lg dark:bg-neutral-900"
        showCloseButton={false}
      >
        <div className="bg-muted dark:neutral-900 mx-auto mt-2 h-1 w-11 rounded" />

        {step === 'method' ? (
          <DepositMethod onOpenQr={handleOpenQr} />
        ) : (
          <DepositQR
            address={qrAddress}
            currency={DEFAULT_CURRENCY}
            network={qrNetwork}
            onClose={() => setStep('method')}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DepositFlowSheet;
