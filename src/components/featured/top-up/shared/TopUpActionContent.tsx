'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import DepositAmountInput from '@/components/featured/deposit/DepositAmountInput';
import DepositPayOsQR from '@/components/featured/deposit/DepositPayOsQR';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useGeneratePayosLink } from '@/hook/payment/useGeneratePayosLink';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { type PayosCheckoutResponse } from '@/types/payment';

type TopUpActionContentProps = {
  onCompleted?: () => void;
  onNonDemo?: () => void;
};

export default function TopUpActionContent({
  onCompleted,
  onNonDemo,
}: TopUpActionContentProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const [payosData, setPayosData] = useState<PayosCheckoutResponse | null>(null);
  const { mutate: generatePayos, isPending } = useGeneratePayosLink();
  const { showError } = useToast();

  const handleClose = () => {
    if (onNonDemo) {
      onNonDemo();
    } else if (onCompleted) {
      onCompleted();
    } else {
      router.back();
    }
  };

  const handleAmountSubmit = (amount: number) => {
    if (
      !selectedAccount?.id ||
      selectedAccount.accountTypeId === ACCOUNT_TYPES_ID.DEMO
    ) {
      showError(
        t('topUp.topUpFailedTitle'),
        'Vui lòng chọn tài khoản giao dịch thật để nạp tiền.',
      );
      return;
    }

    generatePayos(
      { accountId: selectedAccount.id, amount },
      { onSuccess: (data) => setPayosData(data) },
    );
  };

  if (payosData) {
    return (
      <DepositPayOsQR
        {...payosData}
        onClose={() => setPayosData(null)}
      />
    );
  }

  return (
    <DepositAmountInput
      onClose={handleClose}
      onSubmit={handleAmountSubmit}
      isPending={isPending}
    />
  );
}
