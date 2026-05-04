'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Input } from '@/components/shared/atoms/input';
import { Attachment02, Send03 } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { supportApi, type SupportMessage } from '@/services/supportService';
import { useAuthStore } from '@/store/authStore';
import { SupportMessageType, SupportTicketStatus, SupportTicketSubject } from '@/types/support';
import { imageApi } from '@/services/imageService';
import dayjs from 'dayjs';
import Image from 'next/image';

function formatMessageTime(iso: string) {
  const formatted = dayjs(iso).format('HH:mm');
  return formatted === 'Invalid Date' ? iso : formatted;
}

export default function Chat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showError } = useToast();
  const userId = useAuthStore((state) => state.user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isSending, setSending] = useState(false);
  const [isUploadingImage, setUploadingImage] = useState(false);
  const [isResolvedTicket, setResolvedTicket] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(searchParams.get('ticketId'));
  const requestedSubject = searchParams.get('subject');
  const requestedStatus = searchParams.get('status');
  const isCreatingMode = searchParams.get('create') === '1' && !ticketId;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pollingInFlightRef = useRef(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const selectedSubject = useMemo(() => {
    const values = Object.values(SupportTicketSubject) as string[];
    if (requestedSubject && values.includes(requestedSubject)) {
      return requestedSubject as SupportTicketSubject;
    }
    return SupportTicketSubject.Other;
  }, [requestedSubject]);

  const refreshMessages = useCallback(
    async (currentTicketId: string) => {
      try {
        const response = await supportApi.getMessages(currentTicketId, { take: 50 });
        setMessages((response.data ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      } catch (error) {
        showError(
          t('supportChat.loadingFailedTitle', 'Cannot load chat messages'),
          localizeApiError(error, t, 'Failed to load messages.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [showError, t],
  );

  const pollMessages = useCallback(async (currentTicketId: string) => {
    if (pollingInFlightRef.current) return;
    pollingInFlightRef.current = true;
    try {
      // Use a bigger `take` for polling to reduce chance missing messages between refreshes.
      const response = await supportApi.getMessages(currentTicketId, { take: 100 });
      setMessages((response.data ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch {
      // Avoid spamming a toast every minute; polling failures are non-critical.
    } finally {
      pollingInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      setMessages([]);
      setResolvedTicket(false);
      return;
    }
    setLoading(true);
    void refreshMessages(ticketId);
  }, [refreshMessages, ticketId]);

  useEffect(() => {
    if (!ticketId || isResolvedTicket) return;
    const intervalMs = 60_000;
    const intervalId = window.setInterval(() => {
      void pollMessages(ticketId);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [isResolvedTicket, pollMessages, ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    let mounted = true;

    const loadTicketStatus = async () => {
      const parsedStatus = Number(requestedStatus);
      if (Number.isFinite(parsedStatus)) {
        if (mounted) setResolvedTicket(parsedStatus === SupportTicketStatus.Resolved);
        return;
      }

      try {
        const ticket = await supportApi.getTicketById(ticketId);
        if (!mounted) return;
        setResolvedTicket(ticket.status === SupportTicketStatus.Resolved);
      } catch {
        if (mounted) setResolvedTicket(false);
      }
    };

    void loadTicketStatus();

    return () => {
      mounted = false;
    };
  }, [requestedStatus, ticketId]);

  const quickActions = useMemo(() => {
    // Try reading localized quick action templates from i18n resources.
    const localized = t(`supportChat.quickActions.${selectedSubject}`, { returnObjects: true }) as
      | string[]
      | undefined;

    if (Array.isArray(localized) && localized.length > 0) return localized;

    // Fallback English templates (in case some locale is missing keys)
    const fallback: Record<SupportTicketSubject, string[]> = {
      [SupportTicketSubject.AccountIssue]: [
        'Cannot access my account',
        'Update account information',
        'Security concern',
      ],
      [SupportTicketSubject.Deposit]: [
        'Deposit pending',
        'Deposit not credited',
        'Minimum deposit amount',
      ],
      [SupportTicketSubject.Withdrawal]: [
        'Withdrawal pending',
        'Withdrawal rejected',
        'Network fee details',
      ],
      [SupportTicketSubject.TradingIssue]: [
        'Order execution delay',
        'Slippage discrepancy',
        'Cannot place order',
      ],
      [SupportTicketSubject.TechnicalIssue]: [
        'App performance issue',
        'Cannot load market data',
        'Login error on app',
      ],
      [SupportTicketSubject.Verification]: [
        'KYC status check',
        'Document rejected',
        'How to verify account',
      ],
      [SupportTicketSubject.Billing]: [
        'Unexpected charges',
        'Commission clarification',
        'Billing statement request',
      ],
      [SupportTicketSubject.Other]: [
        'Deposit & Withdraw',
        'Profit Sharing',
        'Comprehensive Trading Guide',
        'Copy Trade Setup',
        '[KYC]',
        'Legal & Reports',
      ],
    };

    return fallback[selectedSubject] ?? fallback[SupportTicketSubject.Other];
  }, [selectedSubject, t]);

  const ensureTicket = useCallback(
    async (firstMessage: { content: string; messageType: SupportMessageType }) => {
      let currentTicketId = ticketId;
      if (currentTicketId) {
        return { isFirstMessage: false, ticketId: currentTicketId };
      }

      const subject = selectedSubject;
      await supportApi.createTicket({
        message: firstMessage.content,
        messageType: firstMessage.messageType,
        subject,
      });
      const latest = await supportApi.getTickets({ skip: 0, take: 1 });
      currentTicketId = latest.data?.[0]?.id ?? null;
      if (!currentTicketId) {
        throw new Error('ticket-create-failed');
      }
      setTicketId(currentTicketId);
      router.replace(`/chat?ticketId=${currentTicketId}`);
      return { isFirstMessage: true, ticketId: currentTicketId };
    },
    [router, selectedSubject, ticketId],
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || isUploadingImage || isResolvedTicket) return;
    setSending(true);
    try {
      const { isFirstMessage, ticketId: currentTicketId } = await ensureTicket({
        content: text,
        messageType: SupportMessageType.Text,
      });
      if (!isFirstMessage) {
        await supportApi.sendMessage(currentTicketId, {
          content: text,
          isFirstMsg: false,
          messageType: SupportMessageType.Text,
        });
      }

      setInput('');
      await refreshMessages(currentTicketId);
    } catch (error) {
      showError(
        isCreatingMode
          ? t('supportChat.createFailedTitle', 'Cannot create support ticket')
          : t('supportChat.sendFailedTitle', 'Cannot send message'),
        localizeApiError(error, t, 'Please try again.'),
      );
    } finally {
      setSending(false);
    }
  }, [
    ensureTicket,
    input,
    isCreatingMode,
    isSending,
    isUploadingImage,
    isResolvedTicket,
    refreshMessages,
    showError,
    t,
  ]);

  const handleUploadImage = useCallback(
    async (file?: File) => {
      if (!file || isSending || isUploadingImage || isResolvedTicket) return;
      if (!file.type.startsWith('image/')) {
        showError(
          t('supportChat.sendFailedTitle', 'Cannot send message'),
          'Only image files are supported.',
        );
        return;
      }

      setUploadingImage(true);
      try {
        const imageUrl = await imageApi.uploadImageToPresignedUrl(file, {
          fileName: file.name,
          type: file.type,
        });

        const { isFirstMessage, ticketId: currentTicketId } = await ensureTicket({
          content: imageUrl,
          messageType: SupportMessageType.Image,
        });
        if (!isFirstMessage) {
          await supportApi.sendMessage(currentTicketId, {
            content: imageUrl,
            isFirstMsg: false,
            messageType: SupportMessageType.Image,
          });
        }

        await refreshMessages(currentTicketId);
      } catch (error) {
        showError(
          t('supportChat.sendFailedTitle', 'Cannot send message'),
          localizeApiError(error, t, 'Image upload failed.'),
        );
      } finally {
        setUploadingImage(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [ensureTicket, isResolvedTicket, isSending, isUploadingImage, refreshMessages, showError, t],
  );

  return (
    <div className="bg-background mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <Header label={t('supportChat.title', 'MTX Assistant')} onBack={() => router.back()} />

      <div
        className={`flex-1 overflow-y-auto px-3 sm:px-4 ${isResolvedTicket ? 'pb-44' : 'pb-24'}`}
      >
        {isLoading ? (
          <div className="space-y-4 py-3">
            <div className="flex items-start gap-2">
              <div className="bg-muted h-5 w-5 animate-pulse rounded-full" />
              <div className="bg-muted h-14 w-[75%] animate-pulse rounded" />
            </div>
            <div className="flex justify-end">
              <div className="bg-muted h-10 w-[60%] animate-pulse rounded" />
            </div>
            <div className="flex justify-start">
              <div className="bg-muted h-11 w-[68%] animate-pulse rounded" />
            </div>
            <div className="flex justify-end">
              <div className="bg-muted h-9 w-[52%] animate-pulse rounded" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-2">
            <div className="mb-4 flex items-start gap-2">
              <Image src="/logo/logo.png" alt="MTX Trading" width={20} height={20} />
              <div className="text-body-small-regular bg-card rounded p-3">
                {t('supportChat.welcome')}
              </div>
            </div>
            <div className="ml-auto flex w-full max-w-[90%] flex-wrap justify-end gap-2 sm:max-w-[80%]">
              {quickActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  onClick={() => setInput(action)}
                  variant="primary-outline"
                  className="text-body-small-regular h-auto rounded px-3 py-2"
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {messages.map((msg) => {
              const mine = msg.senderId === userId;
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`flex w-full items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!mine ? (
                      <Image
                        src="/logo/logo.png"
                        alt="MTX Support"
                        width={26}
                        height={26}
                        className="mb-1 shrink-0 rounded-full"
                      />
                    ) : null}
                    <div className="max-w-[85%] sm:max-w-[75%]">
                      {!mine ? (
                        <p className="text-muted-foreground text-body-caption-regular mb-1 text-xs">
                          MTX Trading
                        </p>
                      ) : null}
                      <div
                        className={`rounded px-3 py-2 ${
                          mine
                            ? 'bg-primary-500 text-white'
                            : 'text-foreground bg-neutral-100 dark:bg-neutral-800'
                        }`}
                      >
                        {msg.messageType === SupportMessageType.Image ? (
                          <button
                            type="button"
                            className="block w-full cursor-zoom-in rounded p-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            onClick={() => setImagePreviewUrl(msg.content)}
                            aria-label={t('supportChat.openImagePreview', 'View image larger')}
                          >
                            <Image
                              src={msg.content}
                              alt=""
                              width={448}
                              height={224}
                              unoptimized
                              className="pointer-events-none h-auto max-h-56 w-auto rounded object-contain"
                            />
                          </button>
                        ) : (
                          <p className="text-body-small-regular">{msg.content}</p>
                        )}
                        <p
                          className={`text-caption-regular mt-1 text-right ${mine ? 'text-white/80' : 'text-muted-foreground'}`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isResolvedTicket ? (
        <div className="fixed right-0 bottom-0 left-0 z-20">
          <div className="bg-background mx-auto w-full max-w-3xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="border-border bg-card rounded border p-4 text-center">
              <p className="text-body-large-medium text-foreground">
                {t('supportChat.resolvedTitle', 'This ticket has been resolved')}
              </p>
              <p className="text-body-small-regular text-muted-foreground mt-2">
                {t(
                  'supportChat.resolvedDescription',
                  'If you need more help, please create a new ticket and our team will assist you shortly.',
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isResolvedTicket ? (
        <div className="fixed right-0 bottom-0 left-0 z-20">
          <div className="bg-background mx-auto w-full max-w-3xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-1 items-center gap-2">
              <Button
                type="button"
                variant="white-contained"
                className="text-muted-foreground flex h-10 w-6 items-center justify-center p-0"
                onClick={() => imageInputRef.current?.click()}
                disabled={isSending || isUploadingImage}
                aria-label="Upload image"
              >
                <Attachment02 size={24} />
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleUploadImage(event.target.files?.[0])}
              />
              <div className="flex-1">
                <Input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t('supportChat.placeholder', 'Type a message')}
                  className="border-border bg-background h-11 w-full text-sm dark:bg-transparent"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rightAccessory={
                    input.trim() ? (
                      <Button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={isSending || isUploadingImage}
                        variant="white-contained"
                        className="text-primary-500 ml-2 flex h-7 w-7 items-center justify-center p-0 disabled:opacity-50"
                        aria-label={t('common.send', 'Send')}
                      >
                        {isSending || isUploadingImage ? (
                          '...'
                        ) : (
                          <Send03 size={24} className="text-primary-500" />
                        )}
                      </Button>
                    ) : null
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={imagePreviewUrl !== null}
        onOpenChange={(open) => {
          if (!open) setImagePreviewUrl(null);
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-[min(96vw,1200px)] border-0 bg-neutral-950 p-3 shadow-xl sm:max-w-[min(96vw,1200px)] [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:hover:text-white"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {t('supportChat.imagePreviewTitle', 'Image preview')}
          </DialogTitle>
          {imagePreviewUrl ? (
            <div className="flex max-h-[85vh] w-full items-center justify-center overflow-auto">
              <Image
                src={imagePreviewUrl}
                alt=""
                width={1600}
                height={1600}
                unoptimized
                className="h-auto max-h-[85vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
