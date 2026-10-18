'use client';

import { ArrowDown, ArrowUp, Check, Copy03, Plus } from '@untitledui/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { supportApi, type SupportTicket } from '@/services/supportService';
import { SupportTicketStatus } from '@/types/support';

type SortDirection = 'asc' | 'desc';

const statusTextStyles: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.Open]: 'text-yellow-500',
  [SupportTicketStatus.InProgress]: 'text-primary-500',
  [SupportTicketStatus.Resolved]: 'text-green-500',
  [SupportTicketStatus.Closed]: 'text-muted-foreground',
};

function formatSupportTime(value: string) {
  const formatted = dayjs(value).format('DD/MM HH:mm');
  return formatted === 'Invalid Date' ? value : formatted;
}

type SupportScreenWebProps = {
  onOpenChat: (payload: { ticketId: string; status: SupportTicketStatus }) => void;
  onCreateChat: () => void;
};

export default function SupportScreenWeb({ onOpenChat, onCreateChat }: SupportScreenWebProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();

  const [isLoading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
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
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="text-foreground flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center">
        <h2 className="text-h3-semibold text-foreground">
          {t('supportHistory.title', 'Support History')}
        </h2>
      </div>

      <div className="border-border mb-2 flex items-end gap-2 overflow-x-auto border-b">
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

      <div className="mb-2">
        <Button
          type="button"
          variant="white-contained"
          className="h-auto justify-start px-0 py-1 text-left"
          aria-label={t('supportHistory.filterAria', 'Filter')}
          onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
        >
          <div className="flex items-center gap-2">
            <span className="text-body-small-regular text-muted-foreground">
              {t('supportHistory.sortBy', 'Sort by')}:
            </span>
            <span className="text-body-small-medium text-primary-500">
              {t('supportHistory.sortByTime', 'Time')}
            </span>
            {sortDirection === 'desc' ? (
              <ArrowDown className="text-primary-500" size={16} />
            ) : (
              <ArrowUp className="text-primary-500" size={16} />
            )}
          </div>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
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
          <div className="flex min-h-[50vh] flex-col items-center justify-center">
            <p className="text-body-large-medium text-muted-foreground">
              {t('home.noDataAvailable', 'No data available')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {filteredAndSortedTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onOpenChat({ ticketId: ticket.id, status: ticket.status })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenChat({ ticketId: ticket.id, status: ticket.status });
                  }
                }}
                role="button"
                tabIndex={0}
                className="bg-background border-border flex w-full cursor-pointer flex-col border-b px-3 py-3 text-left"
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
                  <span className="text-caption-medium bg-muted text-foreground rounded px-3 py-1">
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

      <div className="mt-4">
        <Button
          className="flex h-12 w-full items-center justify-center rounded-lg"
          onClick={onCreateChat}
          variant="primary-contained"
        >
          <Plus size={16} className="mr-2" />
          {t('supportHistory.createTicket', 'Create new ticket')}
        </Button>
      </div>
    </div>
  );
}

