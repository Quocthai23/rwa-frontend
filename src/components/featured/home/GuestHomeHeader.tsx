import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/atoms/button';
import { HomeHeaderBarSkeleton, TotalAssetSkeleton } from './skeletons';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

// Lottie animation files in the `public` directory should be referenced via their public path
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
export default function GuestHomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useTheme();
  const [homeBannerAnimationData, setHomeBannerAnimationData] = useState(null);
  const [homeBannerAnimationDataDark, setHomeBannerAnimationDataDark] = useState(null);
  const animationData = mode === 'dark' ? homeBannerAnimationDataDark : homeBannerAnimationData;

  useEffect(() => {
    // Fetch the Lottie JSON data from the public path
    fetch('/assets/animations/home_banner.json')
      .then((response) => response.json())
      .then((data) => setHomeBannerAnimationData(data))
      .catch((error) => console.error('Error loading Lottie animation:', error));
  }, []);

  useEffect(() => {
    // Fetch the Lottie JSON data from the public path
    fetch('/assets/animations/crypto-growth-darkmode.json')
      .then((response) => response.json())
      .then((data) => setHomeBannerAnimationDataDark(data))
      .catch((error) => console.error('Error loading Lottie animation:', error));
  }, []);

  if (!homeBannerAnimationData || !homeBannerAnimationDataDark) {
    return (
      <div>
        <HomeHeaderBarSkeleton />
        <TotalAssetSkeleton />
      </div>
    );
  }

  return (
    <div className="relative flex h-40 w-full items-center p-4">
      <div className="w-[55%]">
        <p className="text-body-small-regular text-foreground text-sm">
          {t('home.connectCryptoWorld')}
        </p>

        <h3 className="text-h3-semibold text-foreground">{t('home.guestHeroTitle')}</h3>

        <div className="mt-3 flex gap-3">
          <Button
            variant="neutral-contained"
            className="bg-primary-50 text-primary-500 flex-1 px-3 py-2"
            onClick={() => router.push('/login')}
          >
            <span className="text-body-large-medium text-primary-500">{t('home.login')}</span>
          </Button>

          <Button
            variant="primary-contained"
            className="bg-primary-500 flex-1 px-3 py-2 text-white"
            onClick={() => router.push('/register')}
          >
            <span className="text-body-large-medium text-white">{t('home.signUp')}</span>
          </Button>
        </div>
      </div>

      <Lottie animationData={animationData} loop className="absolute right-0 h-40 w-42.5" />
    </div>
  );
}
