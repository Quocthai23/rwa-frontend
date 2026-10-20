'use client';
import { useTranslation } from 'react-i18next';
import { AssetEntryDetailDialog } from './AssetEntryDetailDialog';
import { AssetManagementButton as Button } from './AssetManagementButton';
import { formatVnd, getIntlLocale } from '@/i18n/formatting';
import type { RentalIncomeDistribution } from '@/types/dividend';

export function RentalIncomeDetailSheet({
  distribution,
  assetName,
  onClose,
  onClaim,
  claiming,
}: {
  distribution: RentalIncomeDistribution;
  assetName: string;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const total = distribution.claims.reduce((sum, claim) => sum + Number(claim.amount), 0);
  const pending = distribution.claims
    .filter((claim) => claim.status === 'PENDING')
    .reduce((sum, claim) => sum + Number(claim.amount), 0);
  const date = (value: string) => new Date(value).toLocaleDateString(locale);
  return (
    <AssetEntryDetailDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      eyebrow={assetName}
      title={t('assetManagement.rentalOperations.transactionDetails')}
      description={t('assetManagement.rentalOperations.incomeHistoryDescription')}
      status={t(
        pending > 0
          ? 'assetManagement.rentalOperations.unclaimed'
          : total > 0
            ? 'assetManagement.rentalOperations.claimed'
            : 'assetManagement.rentalOperations.noEntitlement',
      )}
      amount={formatVnd(pending > 0 ? pending : total, locale)}
      fields={[
        {
          label: t('assetManagement.rentalOperations.period'),
          value: `${date(distribution.periodStart)} – ${date(distribution.periodEnd)}`,
        },
        {
          label: t('assetManagement.rentalOperations.grossAmount'),
          value: formatVnd(distribution.totalAmount, locale),
        },
        {
          label: t('assetManagement.rentalOperations.allocatedAmount'),
          value: formatVnd(distribution.allocatedAmount, locale),
        },
        {
          label: t('assetManagement.rentalOperations.yourAmount'),
          value: formatVnd(total, locale),
        },
        {
          label: t('assetManagement.details.metadataLabels.snapshotDate'),
          value: date(distribution.snapshotDate),
        },
        {
          label: t('assetManagement.details.transactionId'),
          value: distribution.id,
          mono: true,
          wide: true,
        },
      ]}
      closeLabel={t('assetManagement.details.close')}
      actions={
        pending > 0 ? (
          <Button onClick={onClaim} disabled={claiming}>
            {t(claiming ? 'common.processing' : 'assetManagement.rentalOperations.claimRent')}
          </Button>
        ) : undefined
      }
    />
  );
}
