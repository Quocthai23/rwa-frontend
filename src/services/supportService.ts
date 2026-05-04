import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';
import { SupportMessageType, SupportTicketStatus, SupportTicketSubject } from '@/types/support';

export type SupportTicket = {
  id: string;
  subject: SupportTicketSubject;
  title: string;
  status: SupportTicketStatus;
  priority: number;
  createdByUserId: string;
  createdAt: string;
  resolvedAt: null | string;
};

export type SupportMessage = {
  id: string;
  content: string;
  messageType: SupportMessageType;
  ticketId: string;
  senderId: string;
  createdAt: string;
};

export type SupportMessagesResponse = {
  data: SupportMessage[];
  nextCursor?: null | string;
  total: number;
};

export type SupportTicketListResponse = {
  data: SupportTicket[];
  total: number;
};
export type SupportTicketDetail = SupportTicket;

const isServer = typeof window === 'undefined';

export const supportApi = {
  createTicket: (
    payload: {
      message?: string;
      messageType?: SupportMessageType;
      subject: SupportTicketSubject;
    },
    accessToken?: string,
  ) => {
    const body = {
      subject: payload.subject,
      ...(payload.message ? { message: payload.message } : {}),
      ...(payload.messageType !== undefined ? { messageType: payload.messageType } : {}),
    };

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean }>('support-tickets', body, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<{ success: boolean }>('/api/support-tickets', body, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
  getMessages: (
    ticketId: string,
    params?: { cursor?: string; take?: number },
    accessToken?: string,
  ) => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<SupportMessagesResponse>(
        `support-tickets/${ticketId}/messages`,
        params,
        {
          headers,
          skipAuth: !accessToken,
        },
        true,
      );
    }

    return apiClient.get<SupportMessagesResponse>(
      `/api/support-tickets/${ticketId}/messages`,
      params,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
      true,
    );
  },
  getTickets: (params?: { skip?: number; take?: number }, accessToken?: string) => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<SupportTicketListResponse>(
        'support-tickets',
        params,
        {
          headers,
          skipAuth: !accessToken,
        },
        true,
      );
    }

    return apiClient.get<SupportTicketListResponse>(
      '/api/support-tickets',
      params,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
      true,
    );
  },
  getTicketById: (ticketId: string, accessToken?: string) => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<SupportTicketDetail>(`support-tickets/${ticketId}`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<SupportTicketDetail>(`/api/support-tickets/${ticketId}`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
  sendMessage: (
    ticketId: string,
    payload: { content: string; isFirstMsg?: boolean; messageType?: SupportMessageType },
    accessToken?: string,
  ) => {
    const body = {
      content: payload.content,
      isFirstMsg: payload.isFirstMsg ?? false,
      messageType: payload.messageType ?? SupportMessageType.Text,
    };

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean }>(`support-tickets/${ticketId}/messages`, body, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<{ success: boolean }>(`/api/support-tickets/${ticketId}/messages`, body, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
};
