'use client';

import { ArrowDown, ArrowUp, Copy03, FilterFunnel02, Plus, Check } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { useTranslation } from 'react-i18next';
import { supportApi, type SupportTicket } from '@/services/supportService';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { SupportTicketStatus, SupportTicketSubject } from '@/types/support';
import dayjs from 'dayjs';

type SortDirection = 'asc' | 'desc';

const statusTextStyles: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.Open]: 'text-yellow-500',
  [SupportTicketStatus.InProgress]: 'text-primary-500',
  [SupportTicketStatus.Resolved]: 'text-green-500',
  [SupportTicketStatus.Closed]: 'text-neutral-600',
};

function formatSupportTime(value: string) {
  const formatted = dayjs(value).format('DD/MM HH:mm');
  return formatted === 'Invalid Date' ? value : formatted;
}

export default function SupportHistory() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [isLoading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isSubjectSheetOpen, setSubjectSheetOpen] = useState(false);
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'all' | SupportTicketStatus>('all');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTickets = async () => {
      setLoading(true);
      try {
        const response = await supportApi.getTickets({ skip: 0, take: 50 });
        if (!mounted) return;
        setTickets(response.data ?? []);
      } catch (error) {
        if (!mounted) return;
        showError(
          t('supportHistory.loadFailedTitle', 'Cannot load support history'),
          localizeApiError(error, t, 'Failed to fetch support tickets.'),
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadTickets();

    return () => {
      mounted = false;
    };
  }, [showError, t]);

  const statusTabs = useMemo(
    () => [
      { key: 'all' as const, label: t('common.all', 'All') },
      {
        key: SupportTicketStatus.InProgress as const,
        label: t(`supportHistory.status.${SupportTicketStatus.InProgress}`, 'In progress'),
      },
      {
        key: SupportTicketStatus.Resolved as const,
        label: t(`supportHistory.status.${SupportTicketStatus.Resolved}`, 'Resolved'),
      },
      {
        key: SupportTicketStatus.Open as const,
        label: t(`supportHistory.status.${SupportTicketStatus.Open}`, 'Open'),
      },
      {
        key: SupportTicketStatus.Closed as const,
        label: t(`supportHistory.status.${SupportTicketStatus.Closed}`, 'Closed'),
      },
    ],
    [t],
  );

  const filteredAndSortedTickets = useMemo(() => {
    const filtered =
      activeStatus === 'all' ? tickets : tickets.filter((ticket) => ticket.status === activeStatus);

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [activeStatus, sortDirection, tickets]);

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

  const handleCopyTicketId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showSuccess(
        t('supportHistory.copySuccessTitle', 'Copied'),
        t('supportHistory.copySuccessMessage', 'Ticket ID copied to clipboard.'),
      );
    } catch {
      showError(
        t('supportHistory.copyFailedTitle', 'Copy failed'),
        t('supportHistory.copyFailedMessage', 'Cannot copy ticket ID. Please try again.'),
      );
    }
    setCopiedId(id);
    // Reset copy state after 2 seconds
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <Header
        label={t('supportHistory.title', 'Support History')}
        rightItem={
          <Button
            variant="white-contained"
            className="h-8 w-8 rounded-full p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label={t('supportHistory.filterAria', 'Filter')}
            onClick={() => setFilterSheetOpen(true)}
          >
            <FilterFunnel02 size={24} />
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="mb-1 flex items-end gap-2 overflow-x-auto border-b border-neutral-200 pt-1">
          {statusTabs.map((tab) => {
            const isActive = activeStatus === tab.key;
            return (
              <Button
                key={String(tab.key)}
                type="button"
                variant="white-contained"
                className={`h-10 min-w-fit rounded-none border-b-2 px-2 text-center text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-primary-500 text-body-large-semibold text-primary-500!'
                    : 'text-muted-foreground! text-body-large-regular border-transparent hover:border-transparent'
                }`}
                onClick={() => setActiveStatus(tab.key)}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="divide-border divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`support-skeleton-${index}`} className="animate-pulse py-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="bg-muted h-3 w-24 rounded" />
                  <div className="bg-muted h-5 w-20 rounded" />
                </div>
                <div className="bg-muted mb-2 h-4 w-[85%] rounded" />
                <div className="bg-muted h-3 w-40 rounded" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedTickets.length === 0 ? (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
            <p className="text-body-large-medium text-muted-foreground">
              {t('home.noDataAvailable', 'No data available')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {filteredAndSortedTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => router.push(`/chat?ticketId=${ticket.id}&status=${ticket.status}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/chat?ticketId=${ticket.id}&status=${ticket.status}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className="bg-background border-border flex h-auto w-full cursor-pointer flex-col items-start justify-start border-b px-3 py-3 text-left"
              >
                <div className="mb-1 flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-body-small-regular">
                      {ticket.id.length > 15
                        ? `${ticket.id.slice(0, 15).toUpperCase()}...`
                        : ticket.id.toUpperCase()}
                    </span>
                    <Button
                      type="button"
                      variant="white-contained"
                      className="text-muted-foreground hover:text-foreground h-auto min-h-0 p-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopyTicketId(ticket.id);
                      }}
                      aria-label={t('supportHistory.copyIdAria', 'Copy ticket ID')}
                    >
                      {copiedId === ticket.id ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy03 size={16} className="text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <span className="text-caption-medium bg-muted rounded px-3 py-1 text-neutral-700">
                    {t(`supportHistory.subject.${ticket.subject}`, ticket.subject)}
                  </span>
                </div>
                <div className="text-body-large-medium text-foreground line-clamp-2">
                  {ticket.title || ticket.subject}
                </div>
                <div className="mt-1 flex w-full items-center justify-between gap-2">
                  <span className="text-body-small-regular text-muted-foreground">
                    {formatSupportTime(ticket.createdAt)}
                  </span>
                  <span
                    className={`text-body-small-medium px-2 py-0.5 ${statusTextStyles[ticket.status] ?? statusTextStyles[SupportTicketStatus.Open]}`}
                  >
                    {t(`supportHistory.status.${ticket.status}`, 'Open')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-background border-border fixed right-0 bottom-0 left-0 z-20 p-3">
        <div className="mx-auto w-full max-w-3xl px-1">
          <Button
            className="flex h-12 w-full items-center justify-center rounded-lg"
            onClick={() => setSubjectSheetOpen(true)}
            variant="primary-contained"
          >
            <Plus size={16} className="mr-2" />
            {t('supportHistory.createTicket', 'Create new ticket')}
          </Button>
        </div>
      </div>

      <Sheet open={isSubjectSheetOpen} onOpenChange={setSubjectSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-background max-h-[80%] overflow-y-auto rounded p-0"
          showCloseButton={false}
        >
          <div className="bg-border mx-auto mt-2 h-1 w-12 rounded" />
          <div className="px-4 py-1">
            <p className="text-h3-semibold text-foreground">
              {t('supportHistory.selectSubject', 'Select subject')}
            </p>
          </div>
          <div className="border-border border-t" />
          <div className="divide-border pb-safe-offset-4 divide-y">
            {subjectOptions.map((subject) => (
              <Button
                key={subject}
                type="button"
                variant="white-contained"
                className="text-foreground hover:bg-muted h-auto w-full justify-start rounded-none px-4 py-4 text-left"
                onClick={() => {
                  const query = new URLSearchParams({
                    create: '1',
                    subject,
                  });
                  setSubjectSheetOpen(false);
                  router.push(`/chat?${query.toString()}`);
                }}
              >
                <span className="text-body-large-medium">
                  {t(`supportHistory.subject.${subject}`, subject)}
                </span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isFilterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-background max-h-[75%] overflow-y-auto rounded p-0"
          showCloseButton={false}
        >
          <div className="bg-border mx-auto mt-2 h-1 w-12 rounded" />
          <div className="px-4 py-3">
            <p className="text-h3-semibold text-foreground">
              {t('supportHistory.sortBy', 'Sort by')}
            </p>
          </div>
          <div className="border-border border-t" />
          <div className="pb-safe-offset-4">
            <Button
              type="button"
              variant="white-contained"
              className="text-primary h-auto w-full justify-start rounded-none px-4 py-3 text-left"
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            >
              <span className="text-body-large-medium">
                {t('supportHistory.sortByTime', 'Time')}
              </span>
              <span className="ml-auto">
                {sortDirection === 'desc' ? (
                  <ArrowDown className="text-blue-500" size={18} />
                ) : (
                  <ArrowUp className="text-blue-500" size={18} />
                )}
              </span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
