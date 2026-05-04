/**
 * Example: Trading Realtime Dashboard Component
 * Shows real-time trades, prices, order book, and order matches
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTradingRealtimeSocket } from '@/hook/useTradingRealtimeSocket';

type TradeData = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
};

type PriceData = {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  timestamp: number;
};

interface TradingRealtimeDashboardProps {
  symbol: string;
  accountId?: string;
}

/**
 * Example component that displays real-time trading data
 * This is a template - customize styling and layout as needed
 */
export const TradingRealtimeDashboard: React.FC<TradingRealtimeDashboardProps> = ({
  symbol,
  accountId,
}) => {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [myOrderMatches, setMyOrderMatches] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Connect to trading realtime socket
  const store = useTradingRealtimeSocket({
    symbols: [symbol],
    accountId,
    autoConnect: true,
  });

  // Monitor connection status
  useEffect(() => {
    setConnectionStatus(store.isConnected ? 'connected' : 'disconnected');
  }, [store.isConnected]);

  // Listen to trade_matched events
  useEffect(() => {
    const unsubscribe = store.onTradeMatched((trade) => {
      if (trade.symbol === symbol) {
        setTrades((prev) => [trade, ...prev].slice(0, 50)); // Keep last 50 trades
      }
    });

    return unsubscribe;
  }, [store, symbol]);

  // Listen to price_update events
  useEffect(() => {
    const unsubscribe = store.onPriceUpdate((data) => {
      if (data.symbol === symbol) {
        setPriceData(data);
      }
    });

    return unsubscribe;
  }, [store, symbol]);

  // Listen to my_order_matched events
  useEffect(() => {
    const unsubscribe = store.onMyOrderMatched((data) => {
      if (data.symbol === symbol) {
        setMyOrderMatches((prev) => [data, ...prev].slice(0, 20));
      }
    });

    return unsubscribe;
  }, [store, symbol]);

  return (
    <div className="p-4">
      {/* Connection Status */}
      <div className={`mb-4 p-2 rounded ${connectionStatus === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
        <span className={connectionStatus === 'connected' ? 'text-green-700' : 'text-red-700'}>
          {connectionStatus === 'connected' ? '✅ Connected to trading realtime' : '❌ Disconnected'}
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

      {/* My Order Matches */}
      {myOrderMatches.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-2">My Matched Orders ({myOrderMatches.length})</h3>
          <div className="border rounded max-h-48 overflow-y-auto">
            {myOrderMatches.map((match) => (
              <div key={match.orderId} className="p-2 border-b">
                <div className="flex justify-between">
                  <span className={match.side === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                    {match.side} {match.matchedQuantity} @ ${match.matchedPrice}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {new Date(match.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
