'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateOrderPayload, CreateOrderResponse } from '@/types/orders';
import { createOrderAPI } from '@/services/orderService';

type CreateOrderResult = CreateOrderResponse | unknown;

async function createOrderRequest(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  // Generate idempotencyKey if not provided (prevents duplicate submissions)
  const finalPayload = {
    ...payload,
    idempotencyKey: payload.idempotencyKey ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined),
  };

  return createOrderAPI(finalPayload as CreateOrderPayload);
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderRequest,
    onSuccess: () => {
      // Refresh orders and related lists after a new order is created
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-orders'] });
      // Also refresh portfolio data (Spot trading model)
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-portfolio-items'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
