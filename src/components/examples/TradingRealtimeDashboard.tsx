/**
 * Example: Trading Realtime Dashboard Component (REFACTORED)
 * Shows real-time trades, prices, order book using unified store
 */

'use client';

import React, { useMemo } from 'react';
import { useRealtimeStore } from '@/store/realtimeStore';

interface TradingRealtimeDashboardProps {
  symbol: string;
  accountId?: string;
}

/**
 * Example component that displays real-time trading data
 * Uses new unified useRealtimeStore instead of old callbacks
 */
export const TradingRealtimeDashboard: React.FC<TradingRealtimeDashboardProps> = ({
  symbol,
  accountId,
}) => {
  const {
    isConnected,
    lastTrades,
    pricesBySymbol,
    orderBooks,
  } = useRealtimeStore();

  // Get symbol-specific data
  const trades = useMemo(() => {
    return (lastTrades[symbol] || []).slice(0, 50);
  }, [lastTrades, symbol]);

  const priceData = useMemo(() => {
    return pricesBySymbol[symbol] || null;
  }, [pricesBySymbol, symbol]);

  const orderBook = useMemo(() => {
    return orderBooks[symbol] || null;
  }, [orderBooks, symbol]);

  return (
    <div className="p-4">
      {/* Connection Status */}
      <div className={`mb-4 p-2 rounded ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
        <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
          {isConnected ? '✅ Connected to trading realtime' : '❌ Disconnected'}
        </span>
      </div>

      {/* Price Data */}
      {priceData && (
        <div className="mb-4 p-4 bg-blue-50 rounded border">
          <h3 className="font-bold text-lg">{priceData.symbol}</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-gray-600">Last Price: </span>
              <span className="font-bold">${priceData.lastPrice}</span>
            </div>
            <div>
              <span className="text-gray-600">Bid: </span>
              <span>${priceData.bid}</span>
            </div>
            <div>
              <span className="text-gray-600">Ask: </span>
              <span>${priceData.ask}</span>
            </div>
            <div>
              <span className="text-gray-600">Time: </span>
              <span>{new Date(priceData.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-2">Recent Trades ({trades.length})</h3>
        <div className="border rounded max-h-64 overflow-y-auto">
          {trades.length === 0 ? (
            <div className="p-4 text-gray-500">No trades yet. Waiting for real-time data...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Side</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className={`border-t ${trade.side === 'BUY' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <td className="p-2">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                    <td className={`p-2 font-bold ${trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.side}
                    </td>
                    <td className="p-2 text-right">${trade.price}</td>
                    <td className="p-2 text-right">{trade.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
