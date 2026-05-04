'use client';

import Header from '@/components/shared/Header';
import { AboutRow } from '@/components/featured/about/AboutRow';
import { useTranslation } from 'react-i18next';

export default function TermsReportsPage() {
  const { t } = useTranslation();

  const handlePlaceholder = () => {
    // TODO: wire real URLs / sub-pages if needed
    window.open('https://google.com', '_blank');
  };

  return (
    <div className="bg-background min-h-dvh">
      <Header label={t('about.termsAndReports')} />

      <div className="px-4 pt-2 pb-10">
        <div className="bg-card rounde overflow-hidden">
          <AboutRow
            left={
              <span className="text-body-large-medium text-foreground">
                {t('about.termsReports.serviceTermsAndConditions')}
              </span>
            }
            onPress={handlePlaceholder}
            className="bg-card"
            chevronClassName="size-5 text-neutral-400"
          />
          <div className="bg-border h-px" />
          <AboutRow
            left={
              <span className="text-body-large-medium text-foreground">
                {t('about.termsReports.marketSpecifications')}
              </span>
            }
            onPress={handlePlaceholder}
            className="bg-card"
            chevronClassName="size-5 text-neutral-400"
          />
          <div className="bg-border h-px" />
          <AboutRow
            left={
              <span className="text-body-large-medium text-foreground">
                {t('about.termsReports.dataAndPrivacyPolicy')}
              </span>
            }
            onPress={handlePlaceholder}
            className="bg-card"
            chevronClassName="size-5 text-neutral-400"
          />
          <div className="bg-border h-px" />
          <AboutRow
            left={
              <span className="text-body-large-medium text-foreground">
                {t('about.termsReports.riskWarningNotice')}
              </span>
            }
            onPress={handlePlaceholder}
            className="bg-card"
            chevronClassName="size-5 text-neutral-400"
          />
        </div>
      </div>
    </div>
  );
}
