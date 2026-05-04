'use client';

import Image from 'next/image';

import Header from '@/components/shared/Header';
import { AboutRow } from '@/components/featured/about/AboutRow';
import { SOCIAL_LINKS } from '@/constants/sitePublic';
import { useTranslation } from 'react-i18next';

export default function FollowUsPage() {
  const { t } = useTranslation();
  return (
    <div className="bg-background min-h-dvh">
      <Header label={t('about.followUs')} />

      <div className="px-4 pt-2 pb-12">
        <div className="flex flex-col gap-3">
          {SOCIAL_LINKS.map((s, idx) => {
            const socialLabel = s.labelI18nKey ? t(s.labelI18nKey) : s.label;
            return (
              <div key={s.id}>
                <AboutRow
                  left={
                    <div className="flex min-w-0 items-center gap-3">
                      <Image
                        src={s.iconSrc}
                        alt={socialLabel}
                        width={24}
                        height={24}
                        unoptimized
                        className="shrink-0"
                      />
                      <span className="text-body-large-medium text-foreground truncate">
                        {socialLabel}
                      </span>
                    </div>
                  }
                  onPress={() => window.open(s.href, '_blank')}
                />
                {idx !== SOCIAL_LINKS.length - 1 ? <div className="h-px bg-neutral-100" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
