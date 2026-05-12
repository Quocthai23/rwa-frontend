import { SOCKET_CHART_URL } from '@/constants/env';

const isBrowser = typeof window !== 'undefined';

export const getSocketBaseUrl = (): string | undefined => {
    if (!isBrowser) {
        return SOCKET_CHART_URL;
    }

    if (!SOCKET_CHART_URL) {
        return window.location.origin;
    }

    if (SOCKET_CHART_URL.startsWith('/')) {
        return window.location.origin;
    }

    return SOCKET_CHART_URL;
};
