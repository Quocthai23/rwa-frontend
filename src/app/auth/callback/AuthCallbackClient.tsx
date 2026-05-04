'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signOut } from 'next-auth/react';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import SplashLogo from '@/components/shared/SplashLogo';

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get('redirect') ?? '/', [searchParams]);
  const oauthError = searchParams.get('error');
  const hasProcessedRef = useRef(false);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const completeGoogleLogin = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      if (oauthError) {
        router.replace(`/login?googleError=${encodeURIComponent(oauthError)}`);
        return;
      }

      try {
        const session = (await getSession()) as ({ idToken?: string } | null) | undefined;
        const idToken = session?.idToken;

        if (!idToken) {
          router.replace('/login?googleError=SIGNIN_OAUTH_ERROR');
          return;
        }

        const response = await authApi.loginSocial({ idToken, provider: 'google' });
        if ('status' in response && response.status === 'challenge_required') {
          localStorage.setItem(
            'mfa-flow',
            JSON.stringify({
              challengeId: response.challengeId,
              purpose: 'LOGIN',
              requiredFactors: response.requiredFactors,
            }),
          );

          // Prevent re-processing the same social session on refresh.
          await signOut({ redirect: false });
          router.push(
            `/settings/security/authenticator-app/verify-authenticator?mode=login&redirect=${encodeURIComponent(
              redirectTo,
            )}`,
          );
          return;
        }

        if ('accessToken' in response && response.accessToken) {
          tokenStorage.setAccessToken(response.accessToken);
        }

        if ('user' in response && response.user) {
          login(response.user);
        }

        // Prevent re-processing the same social session on refresh.
        await signOut({ redirect: false });
        router.replace(redirectTo);
      } catch {
        router.replace('/login?googleError=SIGNIN_OAUTH_ERROR');
      }
    };

    void completeGoogleLogin();
  }, [login, oauthError, redirectTo, router]);

  return <SplashLogo size={300} />;
}
