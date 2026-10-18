import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { Check, InfoCircle } from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';

// this component no longer shows another modal itself; it simply notifies
export type WithdrawData = {
  accountId: string;
  address?: string;
  amount: string;
  chainId: string;
};

interface Props {
  closeModal: () => void;
  withdrawData: WithdrawData;
  onContinue: () => void; // called when user accepts risk and wants to proceed
}

const WithdrawRiskConfirm: React.FC<Props> = ({ closeModal, withdrawData, onContinue }) => {
  const { t } = useTranslation();
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const { colors } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-6 py-5">
        <h3 className="text-h3-semibold text-foreground">{t('withdraw.risk.title')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-5 flex w-full flex-col items-center rounded-xl bg-red-50/70 p-4">
          <InfoCircle size={32} color={colors.red500} />
          <p
            className="text-body-small-regular pt-3 text-center"
            style={{ color: colors.neutral500 }}
          >
            {t('withdraw.risk.description')}
          </p>
        </div>

        <div className="w-full rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <p className="text-h3-semibold mb-2" style={{ color: colors.neutral900 }}>
            {t('withdraw.risk.beCautiousTitle')}
          </p>
          <p className="text-body-small-regular leading-5" style={{ color: colors.neutral500 }}>
            {t('withdraw.risk.beCautiousDescription')}
          </p>
        </div>
      </div>

      <div className="border-border mt-auto w-full border-t px-6 py-4">
        <button
          className="mb-3 flex w-full items-center justify-start"
          type="button"
          onClick={() => {
            setAcceptedRisk(!acceptedRisk);
          }}
        >
          <div
            className="mr-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border"
            style={{
              backgroundColor: acceptedRisk ? colors.primary500 : 'transparent',
              borderColor: acceptedRisk ? colors.primary500 : colors.neutral200,
            }}
          >
            {acceptedRisk ? <Check color={colors.neutral0} size={12} /> : null}
          </div>
          <span
            className="text-body-large-regular flex-1 text-left"
            style={{ color: colors.neutral700 }}
          >
            {t('withdraw.risk.acceptLabel')}
          </span>
        </button>

        <Button
          disabled={!acceptedRisk}
          className="w-full px-4 py-3"
          content={t('withdraw.verifyOtp.continue')}
          onClick={() => {
            closeModal();
            onContinue();
          }}
        />
      </div>
    </div>
  );
};

export default WithdrawRiskConfirm;
