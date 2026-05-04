'use client';

import { InfoCircle, AlertTriangle, XCircle, Loading01, CheckCircle } from '@untitledui/icons';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';
import type { CSSProperties } from 'react';
import { createThemeColors } from '@/theme/colors';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const colors = createThemeColors();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'items-start',
          icon: 'mt-0.5 self-start',
          closeButton:
            'border-white/20 bg-black/70 text-neutral-300 hover:!bg-black dark:hover:!bg-neutral-800 hover:!text-white transition-colors',
        },
      }}
      icons={{
        success: (
          <CheckCircle color="black " fill={colors.green500} size={20} className="text-green-500" />
        ),
        info: (
          <InfoCircle color="black" fill={colors.blue500} size={20} className="text-blue-500" />
        ),
        warning: (
          <AlertTriangle
            color="black"
            fill={colors.yellow500}
            size={20}
            className="text-yellow-500"
          />
        ),
        error: <XCircle color="black" fill={colors.red500} size={20} className="text-red-500" />,
        loading: (
          <Loading01
            color="black"
            fill={colors.neutral500}
            size={20}
            className="text-muted-foreground animate-spin"
          />
        ),
      }}
      style={
        {
          '--normal-bg': '#030712',
          '--normal-text': '#ffffff',
          '--normal-border': 'rgba(255,255,255,0.12)',
          '--success-bg': '#030712',
          '--success-text': '#ffffff',
          '--success-border': 'rgba(255,255,255,0.12)',
          '--info-bg': '#030712',
          '--info-text': '#ffffff',
          '--info-border': 'rgba(255,255,255,0.12)',
          '--warning-bg': '#030712',
          '--warning-text': '#ffffff',
          '--warning-border': 'rgba(255,255,255,0.12)',
          '--error-bg': '#030712',
          '--error-text': '#ffffff',
          '--error-border': 'rgba(255,255,255,0.12)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      {...props}
    />
  );
};

type SharedToasterProps = Omit<ToasterProps, 'closeButton'>;

const WebToaster = (props: SharedToasterProps) => <Toaster closeButton {...props} />;

const AppToaster = (props: SharedToasterProps) => <Toaster closeButton={false} {...props} />;

export { Toaster, WebToaster, AppToaster, toast };
