'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import loadingAnimation from '@/assets/animations/Loading.json';

type AnimationContextType = {
  loadingAnimation: any;
};

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [animation, setAnimation] = useState<any>(null);

  useEffect(() => {
    // Preload animation data when provider mounts
    setAnimation(loadingAnimation);
  }, []);

  return (
    <AnimationContext.Provider value={{ loadingAnimation: animation }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    // Return static data if context not available
    return { loadingAnimation };
  }
  return context;
}
