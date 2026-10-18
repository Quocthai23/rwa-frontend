'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { AboutRow } from '@/components/featured/about/AboutRow';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { SITE_PUBLIC, SOCIAL_LINKS_ABOUT_ROW } from '@/constants/sitePublic';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);

  return (
    <div className="bg-background min-h-dvh">
      <Header label={t('about.title')} />

      <div className="px-4 pt-6">
        <div className="flex flex-col items-center">
          <Image
            src={SITE_PUBLIC.aboutLogoSrc}
            alt={t('about.title')}
            width={80}
            height={28}
            unoptimized
          />
          <span className="text-h4-semibold text-foreground dark:text-foreground-dark">
            MTX TRADING
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <AboutRow
            left={t('about.appVersion')}
            right={
              <span className="text-body-large-medium text-muted-foreground">
                {SITE_PUBLIC.appVersionDisplay}
              </span>
            }
          />

          <AboutRow
            left={t('about.followUs')}
            onPress={() => router.push('/about/follow-us')}
            right={
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS_ABOUT_ROW.map((s) => {
                  const socialLabel = s.labelI18nKey ? t(s.labelI18nKey) : s.label;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={socialLabel}
                      className="flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(s.href, '_blank');
                      }}
                    >
                      <Image src={s.iconSrc} alt={socialLabel} width={18} height={18} unoptimized />
                    </button>
                  );
                })}
              </div>
            }
          />

          <AboutRow
            left={t('about.termsAndReports')}
            onPress={() => router.push('/about/terms-reports')}
          />

          <AboutRow
            left={t('about.rateUs')}
            onPress={() => window.open(SITE_PUBLIC.rateUsUrl, '_blank')}
          />

          <AboutRow left={t('about.contactUs')} onPress={() => setIsContactSheetOpen(true)} />
        </div>
      </div>

      <Sheet open={isContactSheetOpen} onOpenChange={setIsContactSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-background flex h-[25%] max-h-[25vh] flex-col overflow-hidden rounded-t-lg p-0"
          showCloseButton={false}
        >
          <div className="bg-border mx-auto mt-2 h-1 w-11 rounded" />

          <div className="px-4 py-1">
            <span className="text-h3-semibold text-foreground">{t('about.contactUs')}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)]">
            <AboutRow
              left={t('about.liveChat')}
              onPress={() => window.open(SITE_PUBLIC.liveChatUrl, '_blank')}
            />
            <AboutRow
              left={t('about.email')}
              onPress={() => window.open(`mailto:${SITE_PUBLIC.supportEmail}`, '_self')}
              showChevron={false}
              right={
                <a
                  href={`mailto:${SITE_PUBLIC.supportEmail}`}
                  className="text-body-large-medium text-primary-500 decoration-primary-500/60"
                >
                  {SITE_PUBLIC.supportEmail}
                </a>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

