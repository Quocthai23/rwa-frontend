import Image from 'next/image';
import Lottie from 'lottie-react';
import { useAnimation } from '@/context/AnimationContext';

type SplashLogoProps = {
  size?: number;
  /**
   * When true, SplashLogo behaves like a full-page splash (min-height screen).
   * When false, it should fit inside an existing container (e.g. chart overlay).
   */
  fullScreen?: boolean;
  /**
   * When false, don't apply background/padding wrappers (useful for overlays).
   */
  showBackground?: boolean;
};

export default function SplashLogo({
  size = 200,
  fullScreen = true,
  showBackground = true,
}: SplashLogoProps) {
  const { loadingAnimation } = useAnimation();
  const heightClass = fullScreen ? 'min-h-screen' : 'h-full min-h-0';
  const backgroundClass = showBackground ? 'bg-background px-4' : '';
  return (
    <div className={`flex items-center justify-center ${heightClass} ${backgroundClass}`}>
      <Lottie animationData={loadingAnimation} style={{ width: size, height: size }} />
    </div>
  );
}
