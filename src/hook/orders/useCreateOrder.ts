'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateOrderPayload, CreateOrderResponse } from '@/types/orders';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

type CreateOrderResult = CreateOrderResponse | unknown;

async function createOrderRequest(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  return apiClient.post<CreateOrderResponse>('/api/create-order', payload, {
    baseUrl: CLIENT_BASE_URL,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderRequest,
    onSuccess: () => {
      // Refresh orders and related lists after a new order is created
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-orders'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
