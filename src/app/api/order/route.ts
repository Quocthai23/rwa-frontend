import { cancelAllOrdersAPI, getOrdersListAPI, updateOrderAPI } from '@/services/orderService';
import { GetOrdersParams } from '@/types';
import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '../_utils/auth';

const ORDER_SORT_BY_VALUES: NonNullable<GetOrdersParams['sortBy']>[] = [
  'createdAt',
  'orderType',
  'quantity',
  'side',
  'symbol',
];

const parseSortBy = (value: string | null): GetOrdersParams['sortBy'] => {
  if (!value) {
    return undefined;
  }

  return ORDER_SORT_BY_VALUES.includes(value as NonNullable<GetOrdersParams['sortBy']>)
    ? (value as NonNullable<GetOrdersParams['sortBy']>)
    : undefined;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  let statusArray = searchParams.getAll('status');
  // If we have one element that contains comma, split it
  if (statusArray.length === 1 && statusArray[0].includes(',')) {
    statusArray = statusArray[0].split(',');
  }

  // Use string-based enums as per Swagger spec
  const sideParam = searchParams.get('side');
  const orderTypeParam = searchParams.get('orderType');

  const params: GetOrdersParams = {
    accountId: searchParams.get('accountId') || '',
    take: searchParams.get('take') ? parseInt(searchParams.get('take')!) : undefined,
    cursor: searchParams.get('cursor') || undefined,
    symbol: searchParams.get('symbol') || undefined,
    side: sideParam === 'BUY' || sideParam === 'SELL' ? sideParam : undefined,
    orderType:
      orderTypeParam === 'MARKET' || orderTypeParam === 'LIMIT' ? orderTypeParam : undefined,
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || undefined,
    fromDate: searchParams.get('fromDate') || undefined,
    toDate: searchParams.get('toDate') || undefined,
    status: statusArray
      .map((s) => s.trim())
      .filter((s) => ['PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED'].includes(s)) as GetOrdersParams['status'],
  };
  return withServerTokenRefresh(
    request,
    (token) => getOrdersListAPI(params, token),
    'orders-fetch-failed',
  );
}

export async function PATCH(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('orderId') || '';
  const accountId = searchParams.get('accountId') || '';
  const body = await request.json().catch(() => null);

  const queryCancel = searchParams.get('cancel');
  const cancelFromQuery = queryCancel === null ? undefined : queryCancel === 'true';
  const payload = {
    cancel: typeof body?.cancel === 'boolean' ? body.cancel : cancelFromQuery,
    price: typeof body?.price === 'string' ? body.price : undefined,
    stopLossPrice: typeof body?.stopLossPrice === 'string' ? body.stopLossPrice : null,
    takeProfitPrice: typeof body?.takeProfitPrice === 'string' ? body.takeProfitPrice : null,
  };

  return withServerTokenRefresh(
    request,
    (token) => updateOrderAPI(orderId, accountId, payload, token),
    'order-update-failed',
  );
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId') || '';
  const body = await request.json().catch(() => null);
  const orderIds = Array.isArray(body?.orderIds) ? (body.orderIds as string[]) : undefined;
  return withServerTokenRefresh(
    request,
    (token) => cancelAllOrdersAPI(accountId, token, orderIds),
    'orders-cancel-all-failed',
  );
}
