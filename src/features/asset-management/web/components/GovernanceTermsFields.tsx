'use client';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/shared/atoms/input';

export type GovernanceTerms = {
  monthlyRentVnd: string;
  depositVnd: string;
  maintenanceBudgetVnd: string;
  operatorName: string;
  operatorContact: string;
  salePriceVnd: string;
  salePlan: string;
};
export const emptyGovernanceTerms: GovernanceTerms = {
  monthlyRentVnd: '',
  depositVnd: '',
  maintenanceBudgetVnd: '',
  operatorName: '',
  operatorContact: '',
  salePriceVnd: '',
  salePlan: '',
};
export function GovernanceTermsFields({
  kind,
  values,
  onChange,
}: {
  kind: string;
  values: GovernanceTerms;
  onChange: (values: GovernanceTerms) => void;
}) {
  const { t } = useTranslation();
  const field = (key: keyof GovernanceTerms, money = false, zero = false) => (
    <label key={key} className="block">
      <span className="text-muted-foreground mb-1.5 block text-xs">
        {t(`assetManagement.terms.${key}`)}
      </span>
      <Input
        required
        value={values[key]}
        onChange={(event) => onChange({ ...values, [key]: event.target.value })}
        type={money ? 'number' : 'text'}
        min={money ? (zero ? 0 : 0.01) : undefined}
        step={money ? '0.01' : undefined}
        maxLength={200}
      />
    </label>
  );
  return (
    <div className="space-y-4">
      {['RENT_CHANGE', 'RENTAL_ENABLEMENT'].includes(kind) && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('monthlyRentVnd', true)}
            {field('depositVnd', true, true)}
          </div>
          {kind === 'RENT_CHANGE' && (
            <p className="text-muted-foreground text-xs leading-5">
              {t('assetManagement.terms.nextRentalOnly')}
            </p>
          )}
        </>
      )}
      {kind === 'MAINTENANCE' && field('maintenanceBudgetVnd', true)}
      {kind === 'OPERATOR_CHANGE' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {field('operatorName')}
          {field('operatorContact')}
        </div>
      )}
      {kind === 'ASSET_SALE' && (
        <>
          {field('salePriceVnd', true)}
          <label className="block">
            <span className="text-muted-foreground mb-1.5 block text-xs">
              {t('assetManagement.terms.salePlan')}
            </span>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={values.salePlan}
              onChange={(event) => onChange({ ...values, salePlan: event.target.value })}
              className="border-border bg-background w-full rounded border p-3 text-sm"
              rows={3}
            />
          </label>
        </>
      )}
    </div>
  );
}

export function governanceTermsPayload(kind: string, terms: GovernanceTerms) {
  if (kind === 'RENT_CHANGE')
    return { monthlyRentVnd: terms.monthlyRentVnd, depositVnd: terms.depositVnd };
  if (kind === 'MAINTENANCE') return { maintenanceBudgetVnd: terms.maintenanceBudgetVnd };
  if (kind === 'OPERATOR_CHANGE')
    return { operatorName: terms.operatorName, operatorContact: terms.operatorContact };
  if (kind === 'ASSET_SALE') return { salePriceVnd: terms.salePriceVnd, salePlan: terms.salePlan };
  return {};
}
