/**
 * Example: Trading Dashboard Component (REFACTORED)
 * 
 * Real-time trading data from unified /trading namespace
 * - Trades (trade_matched events)
 * - Prices (price_update events)
 * - Order book (order_book_update events)
 * 
 * Uses new unified useRealtimeStore instead of separate callbacks
 */

'use client';

import React, { useMemo } from 'react';
import { useRealtimeStore } from '@/store/realtimeStore';

interface TradingDashboardProps {
  symbol: string;
  accountId?: string;
}

/**
 * Trading dashboard displaying real-time data from /trading namespace
 * 
 * @example
 * <TradingDashboard symbol="BTC/USD" accountId={userId} />
 */
export const TradingDashboard: React.FC<TradingDashboardProps> = ({
  symbol,
  accountId,
}) => {
  // Use unified realtime store
  const {
    isConnected,
    lastTrades,
    pricesBySymbol,
    orderBooks,
  } = useRealtimeStore();

  // Get symbol-specific data
  const symbolTrades = useMemo(() => {
    return (lastTrades[symbol] || []).slice(0, 50);
  }, [lastTrades, symbol]);

  const priceData = useMemo(() => {
    return pricesBySymbol[symbol] || null;
  }, [pricesBySymbol, symbol]);

  const orderBook = useMemo(() => {
    return orderBooks[symbol] || null;
  }, [orderBooks, symbol]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded border border-gray-200">
        <div>
          <h2 className="text-lg font-bold">{symbol} Trading</h2>
          <p className="text-sm text-gray-600">Real-time trading dashboard</p>
        </div>
        <div className={`px-3 py-1 rounded text-sm font-semibold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isConnected ? '✅ Connected to /trading' : '❌ Disconnected'}
        </div>
      </div>

      {/* Price Board */}
      {priceData && (
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="font-bold mb-3">Current Price</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Last Price</p>
              <p className="text-2xl font-bold text-blue-600">
                ${priceData.lastPrice.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-600">Bid</p>
                <p className="text-lg font-bold text-green-600">
                  ${priceData.bid.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{priceData.bidSize}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Ask</p>
                <p className="text-lg font-bold text-red-600">
                  ${priceData.ask.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{priceData.askSize}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Updated: {new Date(priceData.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Recent Trades */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-bold">Recent Trades ({symbolTrades.length})</h3>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {symbolTrades.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No trades yet. Waiting for trade_matched events...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Side</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {symbolTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className={`border-t ${trade.side === 'BUY' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                  >
                    <td className="p-3">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td
                      className={`p-3 font-bold ${trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {trade.side}
                    </td>
                    <td className="p-3 text-right">${trade.price.toFixed(2)}</td>
                    <td className="p-3 text-right">{trade.quantity.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* My Matched Orders */}
      {accountId && (
        <div className="bg-purple-50 p-3 rounded text-xs text-purple-700 border border-purple-200">
          <p className="font-semibold mb-1">Note:</p>
          <p>
            For account-specific matched orders, subscribe to order updates using:
            useOrderSocketStore().onOrderMatched(callback)
          </p>
        </div>
      )}

      {/* Data Source Info */}
      <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-200">
        <p className="font-semibold mb-1">Data Source:</p>
        <p>
          Backend: OrderMatchingService (trade_matched) → RealtimeGateway (emit
          to /trading namespace)
        </p>
        <p>WebSocket: ws://localhost:3001/trading</p>
        <p>Events: trade_matched, price_update, order_book_update, my_order_matched</p>
      </div>
    </div>
  );
};
