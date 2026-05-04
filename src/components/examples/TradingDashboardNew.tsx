/**
 * Example: Trading Dashboard Component
 * 
 * Real-time trading data from /trading namespace
 * - Trades (trade_matched events)
 * - Prices (price_update events)
 * - Order book (order_book_update events)
 * - My orders (my_order_matched events)
 * 
 * Separate from candlestick chart which uses default namespace /
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useTradingRealtimeSocket } from '@/hook/useTradingRealtimeSocket';

interface TradingDashboardProps {
  symbol: string;
  accountId?: string;
}

type TradeEvent = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
};

type PriceUpdate = {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
};

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
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null);
  const [myMatches, setMyMatches] = useState<any[]>([]);

  // Connect to /trading namespace
  const {
    onTradeMatched,
    onPriceUpdate,
    onMyOrderMatched,
    isConnected,
    latestTrades,
    latestPrices,
  } = useTradingRealtimeSocket({
    symbols: [symbol],
    accountId,
    autoConnect: true,
  });

  // Listen to trade_matched events
  useEffect(() => {
    return onTradeMatched((trade) => {
      if (trade.symbol === symbol) {
        setTrades((prev) => [trade, ...prev].slice(0, 50));
      }
    });
  }, [onTradeMatched, symbol]);

  // Listen to price_update events
  useEffect(() => {
    return onPriceUpdate((data) => {
      if (data.symbol === symbol) {
        setPriceData(data);
      }
    });
  }, [onPriceUpdate, symbol]);

  // Listen to my_order_matched events
  useEffect(() => {
    return onMyOrderMatched((data) => {
      if (data.symbol === symbol) {
        setMyMatches((prev) => [data, ...prev].slice(0, 20));
      }
    });
  }, [onMyOrderMatched, symbol]);

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
          <h3 className="font-bold">Recent Trades ({trades.length})</h3>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {trades.length === 0 ? (
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
                {trades.map((trade) => (
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
      {myMatches.length > 0 && accountId && (
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold">My Matched Orders ({myMatches.length})</h3>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {myMatches.map((match, idx) => (
              <div
                key={idx}
                className={`p-3 border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-sm font-bold ${match.side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {match.side}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {match.matchedQuantity.toFixed(4)} @ $
                        {match.matchedPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Order: {match.orderId.substring(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(match.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
