import { apiClient } from './apiClient';

export enum FeedbackType {
  API = 1,
  Deposit = 2,
  Others = 3,
  Events = 4,
  Partnership = 6,
}

export type SubmitFeedbackRequest = {
  feedback: string;
  images: string[];
  type: FeedbackType;
};

export type FeedbackResponse = {
  feedback: {
    createdAt: string;
    feedback: string;
    id: string;
    images: string[];
    status: number;
    type: number;
    updatedAt: string;
  };
};

export type FeedbackErrorResponse = {
  code: string;
  errors: string;
  success: false;
  t: string;
};

const isServer = typeof window === 'undefined';
import { CLIENT_BASE_URL } from './baseUrl';

export const feedbackApi = {
  submitFeedback: async (
    data: SubmitFeedbackRequest,
    accessToken?: string,
  ): Promise<FeedbackResponse> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<FeedbackResponse>('feedback', data, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<FeedbackResponse>('/api/feedback', data, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
};

