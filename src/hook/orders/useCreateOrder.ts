'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateOrderPayload, CreateOrderResponse } from '@/types/orders';
import { createOrderAPI } from '@/services/orderService';

type CreateOrderResult = CreateOrderResponse | unknown;

async function createOrderRequest(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  return createOrderAPI(payload as CreateOrderPayload);
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrderRequest,
    onSuccess: () => {
      // Refresh orders and related lists after a new order is created
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-orders-v2'] });
      // Also refresh portfolio data (Spot trading model)
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-portfolio-items'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-item'] });
    },
  });
}
