import React, { useState } from 'react';
import { useTheme } from '@/theme';
import { Check, InfoCircle } from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';

// this component no longer shows another modal itself; it simply notifies
export type WithdrawData = {
  accountId: string;
  address: string;
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
    <div className="bg-card flex h-full flex-col items-center p-4">
      <div className="pt-4">
        <div className="flex w-full flex-col items-center">
          <InfoCircle size={32} color={colors.red500} />
          <h2 className="text-h2-semibold pt-2" style={{ color: colors.neutral900 }}>
            {t('withdraw.risk.title')}
          </h2>
          <p
            className="text-body-small-regular py-4 text-center"
            style={{ color: colors.neutral500 }}
          >
            {t('withdraw.risk.description')}
          </p>
        </div>

        <div className="w-full rounded-xl px-4 py-3" style={{ backgroundColor: colors.neutral100 }}>
          <p className="text-h3-semibold mb-2" style={{ color: colors.neutral900 }}>
            {t('withdraw.risk.beCautiousTitle')}
          </p>
          <p className="text-body-small-regular leading-5" style={{ color: colors.neutral500 }}>
            {t('withdraw.risk.beCautiousDescription')}
          </p>
        </div>
      </div>

      <div className="mt-auto w-full pb-4">
        <button
          className="flex items-center justify-center py-4"
          type="button"
          onClick={() => {
            setAcceptedRisk(!acceptedRisk);
          }}
        >
          <div
            className="mr-3 flex h-5 w-5 items-center justify-center rounded border"
            style={{
              backgroundColor: acceptedRisk ? colors.primary500 : 'transparent',
              borderColor: acceptedRisk ? colors.primary500 : colors.neutral200,
            }}
          >
            {acceptedRisk ? <Check color={colors.neutral0} size={5} /> : null}
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
