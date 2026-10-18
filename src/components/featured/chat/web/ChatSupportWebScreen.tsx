'use client';

import { ArrowLeft, Attachment02, Send03 } from '@untitledui/icons';
import dayjs from 'dayjs';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { imageApi } from '@/services/imageService';
import { supportApi, type SupportMessage } from '@/services/supportService';
import { useAuthStore } from '@/store/authStore';
import { SupportMessageType, SupportTicketStatus, SupportTicketSubject } from '@/types/support';

type ChatSupportWebScreenProps = {
  ticketId?: null | string;
  requestedStatus?: null | SupportTicketStatus;
  createMode?: boolean;
  subject?: SupportTicketSubject;
  onBack: () => void;
  onTicketCreated?: (ticketId: string) => void;
};

function formatMessageTime(iso: string) {
  const formatted = dayjs(iso).format('HH:mm');
  return formatted === 'Invalid Date' ? iso : formatted;
}

export default function ChatSupportWebScreen({
  ticketId,
  requestedStatus,
  createMode = false,
  subject,
  onBack,
  onTicketCreated,
}: ChatSupportWebScreenProps) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const userId = useAuthStore((state) => state.user?.id);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isSending, setSending] = useState(false);
  const [isUploadingImage, setUploadingImage] = useState(false);
  const [isResolvedTicket, setResolvedTicket] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<null | string>(ticketId ?? null);
  const [selectedSubject, setSelectedSubject] = useState<SupportTicketSubject>(
    subject ?? SupportTicketSubject.Other,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<null | string>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pollingInFlightRef = useRef(false);

  useEffect(() => {
    setActiveTicketId(ticketId ?? null);
  }, [ticketId]);

  useEffect(() => {
    setSelectedSubject(subject ?? SupportTicketSubject.Other);
  }, [subject]);

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
      const response = await supportApi.getMessages(currentTicketId, { take: 100 });
      setMessages((response.data ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch {
      // Polling errors are non-blocking; avoid noisy toasts here.
    } finally {
      pollingInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!activeTicketId) {
      setLoading(false);
      setMessages([]);
      setResolvedTicket(false);
      return;
    }
    setLoading(true);
    void refreshMessages(activeTicketId);
  }, [activeTicketId, refreshMessages]);

  useEffect(() => {
    if (!activeTicketId || isResolvedTicket) return;
    const intervalId = window.setInterval(() => {
      void pollMessages(activeTicketId);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [activeTicketId, isResolvedTicket, pollMessages]);

  useEffect(() => {
    if (!activeTicketId) return;
    let mounted = true;

    const loadTicketStatus = async () => {
      if (requestedStatus !== null && requestedStatus !== undefined) {
        if (mounted) {
          setResolvedTicket(requestedStatus === SupportTicketStatus.Resolved);
        }
        return;
      }

      try {
        const ticket = await supportApi.getTicketById(activeTicketId);
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
  }, [activeTicketId, requestedStatus]);

  const quickActions = useMemo(() => {
    const localized = t(`supportChat.quickActions.${selectedSubject}`, { returnObjects: true }) as
      | string[]
      | undefined;

    if (Array.isArray(localized) && localized.length > 0) return localized;

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

  const subjectOptions = useMemo(
    () => [
      SupportTicketSubject.AccountIssue,
      SupportTicketSubject.Deposit,
      SupportTicketSubject.Withdrawal,
      SupportTicketSubject.TradingIssue,
      SupportTicketSubject.TechnicalIssue,
      SupportTicketSubject.Verification,
      SupportTicketSubject.Billing,
      SupportTicketSubject.Other,
    ],
    [],
  );

  const ensureTicket = useCallback(
    async (firstMessage: { content: string; messageType: SupportMessageType }) => {
      let currentTicketId = activeTicketId;
      if (currentTicketId) {
        return { isFirstMessage: false, ticketId: currentTicketId };
      }

      await supportApi.createTicket({
        message: firstMessage.content,
        messageType: firstMessage.messageType,
        subject: selectedSubject,
      });

      const latest = await supportApi.getTickets({ skip: 0, take: 1 });
      currentTicketId = latest.data?.[0]?.id ?? null;
      if (!currentTicketId) {
        throw new Error('ticket-create-failed');
      }

      setActiveTicketId(currentTicketId);
      onTicketCreated?.(currentTicketId);
      return { isFirstMessage: true, ticketId: currentTicketId };
    },
    [activeTicketId, onTicketCreated, selectedSubject],
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
        createMode
          ? t('supportChat.createFailedTitle', 'Cannot create support ticket')
          : t('supportChat.sendFailedTitle', 'Cannot send message'),
        localizeApiError(error, t, 'Please try again.'),
      );
    } finally {
      setSending(false);
    }
  }, [
    createMode,
    ensureTicket,
    input,
    isResolvedTicket,
    isSending,
    isUploadingImage,
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
    <div className="text-foreground flex h-full min-h-0 flex-col">
      <div className="border-border flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition"
          aria-label={t('common.back', 'Back')}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-h3-semibold text-foreground">
          {t('supportChat.title', 'MTX Assistant')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-3">
        {isLoading ? (
          <div className="space-y-4 py-2">
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
          </div>
        ) : messages.length === 0 ? (
          <div className="py-2">
            {!activeTicketId && createMode ? (
              <div className="mb-4">
                <p className="text-body-small-medium text-muted-foreground mb-2">
                  {t('supportHistory.selectSubject', 'Select subject')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.map((item) => {
                    const isActive = item === selectedSubject;
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={isActive ? 'primary-contained' : 'primary-outline'}
                        className="h-auto rounded-full px-3 py-1.5"
                        onClick={() => setSelectedSubject(item)}
                      >
                        {t(`supportHistory.subject.${item}`, item)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mb-4 flex items-start gap-2">
              <Image src="/logo/logo.png" alt="MTX Trading" width={20} height={20} />
              <div className="text-body-small-regular bg-card rounded p-3">
                {t('supportChat.welcome')}
              </div>
            </div>
            <div className="ml-auto flex w-full max-w-[95%] flex-wrap justify-end gap-2">
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
                    <div className="max-w-[80%]">
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
      ) : (
        <div className="border-border bg-background mt-3 border-t pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="white-contained"
              className="text-muted-foreground flex h-10 w-8 items-center justify-center p-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSending || isUploadingImage}
              aria-label="Upload image"
            >
              <Attachment02 size={22} />
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
                className="border-border bg-background h-11 w-full text-sm"
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
                        <Send03 size={22} className="text-primary-500" />
                      )}
                    </Button>
                  ) : null
                }
              />
            </div>
          </div>
        </div>
      )}

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

