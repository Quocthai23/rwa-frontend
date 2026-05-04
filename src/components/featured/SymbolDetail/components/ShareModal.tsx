'use client';

import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Download02, Share04 } from '@untitledui/icons';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hook/useToast';
import { useRef, useState } from 'react';

type ShareModalProps = {
  readonly imageUri: null | string;
  readonly onClose: () => void;
  readonly onShareToDiscover?: (imageUri: string) => void | Promise<void>;
  readonly visible: boolean;
};

type SharePlatform = 'DISCORD' | 'FACEBOOK' | 'INSTAGRAM' | 'MESSENGER' | 'TELEGRAM' | 'TWITTER';

function ShareModal({ imageUri, onClose, onShareToDiscover, visible }: ShareModalProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const resolveShareUrl = () => {
    if (imageUri && /^https?:\/\//i.test(imageUri)) return imageUri;
    return window.location.href;
  };

  const openShareTarget = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getSymbolFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1]?.toUpperCase() || 'MARKET';
    } catch {
      return 'MARKET';
    }
  };

  const buildShareMessage = (social: SharePlatform, shareUrl: string) => {
    const symbol = getSymbolFromUrl(shareUrl);
    const brand = 'MTX Trading';
    const commonTail = `\n${shareUrl}\n${t('symbolDetail.shareModal.shareHashtags', {
      symbol,
      defaultValue: '#MTXTrading #Trading #{{symbol}}',
    })}`;

    const templates: Record<SharePlatform, string> = {
      FACEBOOK: `${t('symbolDetail.shareModal.templates.facebook', {
        brand,
        symbol,
        defaultValue:
          'Discover a trading opportunity on {{symbol}} with {{brand}}.\nThis chart looks interesting - check it now!',
      })}${commonTail}`,
      TELEGRAM: `${t('symbolDetail.shareModal.templates.telegram', {
        brand,
        symbol,
        defaultValue:
          '{{brand}} | {{symbol}}\nA new trading setup is ready. Check the chart details:',
      })}${commonTail}`,
      TWITTER: `${t('symbolDetail.shareModal.templates.twitter', {
        brand,
        symbol,
        defaultValue: '{{brand}} spotlight {{symbol}} - this chart is showing a notable signal.',
      })}${commonTail}`,
      MESSENGER: `${t('symbolDetail.shareModal.templates.messenger', {
        brand,
        symbol,
        defaultValue:
          '{{brand}} just updated the {{symbol}} chart. Open this and check the setup with me!',
      })}${commonTail}`,
      DISCORD: `${t('symbolDetail.shareModal.templates.discord', {
        brand,
        symbol,
        defaultValue:
          '{{brand}} setup for {{symbol}}\nCheck this chart and discuss strategy with the team:',
      })}${commonTail}`,
      INSTAGRAM: `${t('symbolDetail.shareModal.templates.instagram', {
        brand,
        symbol,
        defaultValue:
          '{{brand}} update: {{symbol}}\nToday chart looks great - tap the link for details!',
      })}${commonTail}`,
    };

    return templates[social];
  };

  const handleSaveImage = async () => {
    if (!imageUri) return;
    let objectUrl: null | string = null;
    try {
      let downloadUrl = imageUri;
      if (imageUri.startsWith('data:') || imageUri.startsWith('blob:')) {
        const blob = await fetch(imageUri).then((res) => res.blob());
        objectUrl = URL.createObjectURL(blob);
        downloadUrl = objectUrl;
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `mtx-chart-${Date.now()}.png`;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showSuccess(
        t('symbolDetail.shareModal.downloadSuccess'),
        t('symbolDetail.shareModal.downloadSuccess'),
      );
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('symbolDetail.unknown');
      console.error('Failed to save image:', error);
      showError(t('symbolDetail.shareModal.downloadFailed'), errorMessage);
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const handleShareTo = async (social: SharePlatform) => {
    try {
      const shareUrl = resolveShareUrl();
      const text = buildShareMessage(social, shareUrl);
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(text);
      const fullText = text;

      const shareTargets: Record<
        SharePlatform,
        {
          readonly copyToClipboard?: boolean;
          readonly fallbackUrl?: string;
          readonly manualHint?: string;
          readonly url?: string;
        }
      > = {
        FACEBOOK: {
          // Open Facebook share composer dialog.
          url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
        },
        MESSENGER: {
          // Messenger web composer requires app_id; redirect to messenger with copied text.
          copyToClipboard: true,
          fallbackUrl: 'https://www.messenger.com/new',
          manualHint: t('symbolDetail.shareModal.manualShareHint', {
            defaultValue: 'Content copied. Paste it into the app to share.',
          }),
        },
        DISCORD: {
          // Discord has no public URL endpoint for prefilled content.
          copyToClipboard: true,
          fallbackUrl: 'https://discord.com/channels/@me',
          manualHint: t('symbolDetail.shareModal.manualShareHint', {
            defaultValue: 'Content copied. Paste it into the app to share.',
          }),
        },
        TELEGRAM: {
          // Open Telegram share composer with prefilled text + link.
          url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        TWITTER: {
          // Open X compose page with prefilled status text + url.
          url: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`,
        },
        INSTAGRAM: {
          // Instagram does not support web URL prefill for post composer.
          copyToClipboard: true,
          fallbackUrl: 'https://www.instagram.com/direct/inbox/',
          manualHint: t('symbolDetail.shareModal.manualShareHint', {
            defaultValue: 'Content copied. Paste it into the app to share.',
          }),
        },
      };

      const target = shareTargets[social];

      if (target.copyToClipboard && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
        showSuccess(
          t('symbolDetail.shareModal.copiedToClipboard'),
          t('symbolDetail.shareModal.copiedToClipboard'),
        );
      }

      const urlToOpen = target.url ?? target.fallbackUrl;
      if (urlToOpen) {
        openShareTarget(urlToOpen);
      }
      if (target.manualHint) {
        showError(
          t('symbolDetail.shareModal.manualShareHint'),
          t('symbolDetail.shareModal.manualShareHint'),
        );
      }
      onClose();
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.message !== 'User did not share') {
        console.error('Failed to share:', error);
      }
    }
  };

  const touchStartY = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches?.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      setDragging(true);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging || touchStartY.current == null) return;
    const y = e.touches[0].clientY;
    const dy = y - touchStartY.current;
    if (dy > 0) setTranslateY(dy);
  };

  const onTouchEnd = () => {
    setDragging(false);
    const shouldClose = translateY > 120;
    setTranslateY(0);
    touchStartY.current = null;
    if (shouldClose) onClose();
  };

  const shareActions: Array<{
    readonly alt: string;
    readonly iconSrc?: string;
    readonly id: 'discover' | 'save' | SharePlatform;
    readonly label: string;
  }> = [
    ...(onShareToDiscover
      ? [
          {
            id: 'discover' as const,
            label: t('symbolDetail.share'),
            alt: t('symbolDetail.share'),
          },
        ]
      : []),
    {
      id: 'save',
      label: t('symbolDetail.shareModal.save'),
      alt: t('symbolDetail.shareModal.save'),
    },
    {
      id: 'FACEBOOK',
      label: t('symbolDetail.shareModal.facebook'),
      iconSrc: '/assets/share/fb.svg',
      alt: 'Facebook',
    },
    {
      id: 'MESSENGER',
      label: t('symbolDetail.shareModal.messenger'),
      iconSrc: '/assets/share/message.svg',
      alt: 'Messenger',
    },
    {
      id: 'DISCORD',
      label: t('symbolDetail.shareModal.discord'),
      iconSrc: '/assets/share/discord.svg',
      alt: 'Discord',
    },
    {
      id: 'TELEGRAM',
      label: t('symbolDetail.shareModal.telegram'),
      iconSrc: '/assets/share/telegram.svg',
      alt: 'Telegram',
    },
    {
      id: 'TWITTER',
      label: t('symbolDetail.shareModal.x'),
      iconSrc: '/assets/share/x.svg',
      alt: 'X',
    },
    {
      id: 'INSTAGRAM',
      label: t('symbolDetail.shareModal.instagram'),
      iconSrc: '/assets/share/itg.svg',
      alt: 'Instagram',
    },
  ];

  return (
    <Dialog open={visible} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded border-0 bg-transparent p-0 shadow-none"
      >
        <Button
          className="absolute inset-0 w-screen bg-black/50"
          onClick={onClose}
          aria-label={t('common.cancel')}
        />

        <div
          className="relative z-10 flex h-full flex-col"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          style={{
            transform: translateY ? `translateY(${translateY}px)` : undefined,
            transition: dragging ? 'none' : 'transform 160ms ease',
            touchAction: 'pan-y',
          }}
        >
          {/* Image Preview */}
          <div className="flex flex-1 items-center justify-center overflow-y-auto">
            {imageUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUri}
                alt={t('feedback.previewAlt')}
                className="dark:bg-card w-full max-w-3xl object-contain"
                style={{ maxHeight: 500 }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-body-medium text-white">
                  {t('common.loading', { defaultValue: 'Loading image...' })}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Sheet (sticky inside dialog to keep horizontal alignment) */}
          <div className="sticky bottom-0 left-0 z-40 w-screen">
            <div
              className="dark:bg-card mx-auto max-w-3xl rounded-t-lg bg-white px-4 pt-4 shadow-lg"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                boxSizing: 'border-box',
              }}
            >
              <DialogTitle className="text-body-large-semibold text-foreground mb-5">
                {t('symbolDetail.shareModal.shareImage')}
              </DialogTitle>

              <div className="grid grid-cols-4 justify-items-center gap-x-6 gap-y-6">
                {shareActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="white-contained"
                    className="dark:bg-card flex flex-col items-center gap-2 bg-white"
                    onClick={async () => {
                      if (action.id === 'save') {
                        await handleSaveImage();
                        return;
                      }

                      if (action.id === 'discover') {
                        if (!imageUri) {
                          showError(
                            t('symbolDetail.shareModal.captureFailedTitle', {
                              defaultValue: 'Capture failed',
                            }),
                            t('symbolDetail.shareModal.captureFailed', {
                              defaultValue: 'Failed to capture image. Please try again.',
                            }),
                          );
                          return;
                        }
                        await onShareToDiscover?.(imageUri);
                        return;
                      }

                      await handleShareTo(action.id);
                    }}
                  >
                    {action.id === 'save' ? (
                      <div className="flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="p-3">
                          <Download02 className="text-foreground size-6" />
                        </div>
                      </div>
                    ) : action.id === 'discover' ? (
                      <div className="flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="p-3">
                          <Share04 className="text-foreground size-6" />
                        </div>
                      </div>
                    ) : (
                      <Image src={action.iconSrc ?? ''} alt={action.alt} width={48} height={48} />
                    )}
                    <div className="text-body-large-medium text-foreground text-center">
                      {action.label}
                    </div>
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                variant="white-contained"
                className="mt-5 w-full bg-transparent py-3 text-center"
                onClick={onClose}
              >
                <p className="text-button-large-medium text-primary-500">{t('common.cancel')}</p>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareModal;
