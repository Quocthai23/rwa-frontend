/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FRONTEND TRADING SYSTEM - COMPLETE FLOW GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROJECT: RWA FE (rwa-fe)
 * PURPOSE: Connect to trading WebSocket and display real-time updates
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * PART 1: WEBSOCKET CONNECTIONS & BACKEND FLOW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * BACKEND EMITS VIA 2 SEPARATE GATEWAYS:
 * 
 * Gateway 1: KlineGateway (default namespace /)
 * ────────────────────────────────────────────────
 * Flow: OrderMatchingService → MarketDataService.recordTrade()
 *         ↓
 *       (save trade to Redis/DB + emit kline event)
 *         ↓
 *       FE receives kline event (default namespace /)
 * 
 * Backend Code:
 *   - order-matching.service.ts: match orders, call MarketDataService.recordTrade()
 *   - market-data.service.ts: save trade + emit kline via default namespace
 * 
 * 
 * Gateway 2: RealtimeGateway (/trading namespace)
 * ─────────────────────────────────────────────────
 * Flow: OrderMatchingService emits ORDER_MATCHED event
 *         ↓
 *       TradingEventsListener catches it
 *         ↓
 *       RealtimeGateway broadcasts to /trading namespace
 *         ↓
 *       FE receives trade_matched + other events
 * 
 * Backend Code:
 *   - order-matching.service.ts: emit trade to Redis queue
 *   - trading-events.listener.ts: catch ORDER_MATCHED event → emit to RealtimeGateway
 *   - realtime.gateway.ts: emit trade_matched, price_update, order_book_update, my_order_matched
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════
 * FE SOCKET CONNECTIONS
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Connection 1: Kline Socket (Candlestick Data)
 * ───────────────────────────────────────────────
 * URL: ws://localhost:3001 (default namespace /)
 * Store: src/store/klineSocketStore.ts
 * Hook: src/hook/useCandlestickData.ts ← NEW!
 * Events:
 *   - kline: candlestick OHLCV data with timestamp
 * 
 * Data Flow:
 *   1. GET /market-data/candles?symbol=BTC/USD → load initial historical candles
 *   2. Subscribe to kline socket (symbol, timeframe)
 *   3. Real-time candles arrive via kline event
 *   4. Chart updates with new/updated candles
 * 
 * Usage: Candlestick charts, historical analysis
 * Example: <CandlestickChart symbol="BTC/USD" timeframe={3600} />
 * 
 * 
 * Connection 2: Market Socket (Ticker Data) - OPTIONAL
 * ──────────────────────────────────────────────────────
 * URL: ws://localhost:3001 (default namespace /)
 * Store: src/store/marketSocketStore.ts
 * Events:
 *   - ticker: price, bid, ask, volume
 * Usage: Current price board, ticker updates
 * 
 * 
 * Connection 3: Trading Realtime Socket
 * ──────────────────────────────────────
 * URL: ws://localhost:3001/trading (/trading namespace)
 * Store: src/store/tradingRealtimeSocketStore.ts
 * Hook: src/hook/useTradingRealtimeSocket.ts
 * Events:
 *   - trade_matched: executed trades (price, qty, side, timestamp)
 *   - price_update: real-time bid/ask updates
 *   - order_book_update: orderbook snapshots
 *   - my_order_matched: user's matched orders
 * 
 * Usage: Trading dashboard, trade history, order matching notifications
 * Example: <TradingDashboard symbol="BTC/USD" accountId={userId} />
 */

/**
 * PART 2: FILE STRUCTURE (NEW FILES CREATED)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * CANDLESTICK DATA FILES
 * ──────────────────────
 * 
 * FILE 1: src/hook/useCandlestickData.ts ⭐ NEW!
 * ─────────────────────────────────────────────
 * Hook to manage candlestick data + real-time updates
 * 
 * What it does:
 *   1. Load initial historical candles from GET /market-data/candles
 *   2. Subscribe to kline socket (default namespace /)
 *   3. Listen to kline events
 *   4. Update chart when new candles arrive
 * 
 * Usage:
 *   const { candles, isLoading, currentCandle } = useCandlestickData({
 *     symbol: 'BTC/USD',
 *     timeframe: 3600, // 1 hour
 *     autoLoad: true,
 *     autoConnect: true
 *   });
 * 
 * Returns:
 *   - candles: CandleData[] - array of historical + real-time candles
 *   - isLoading: boolean - loading state
 *   - isConnected: boolean - socket connection status
 *   - currentCandle: CandleData - latest/current candle
 *   - error: string | null - error message if any
 * 
 * 
 * FILE 2: src/components/examples/CandlestickChart.tsx ⭐ NEW!
 * ──────────────────────────────────────────────────────────────
 * Example candlestick chart component
 * 
 * What it does:
 *   - Uses useCandlestickData hook
 *   - Renders SVG candlestick chart
 *   - Auto-updates when new candles arrive
 *   - Shows OHLCV data
 *   - Real-time status indicator
 * 
 * Usage:
 *   <CandlestickChart symbol="BTC/USD" timeframe={3600} />
 * 
 * Features:
 *   ✅ SVG rendering (lightweight, no external charting lib needed)
 *   ✅ Auto-scale to fit all candles
 *   ✅ Grid lines with price labels
 *   ✅ Color-coded candles (green = up, red = down)
 *   ✅ Real-time updates
 * 
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * TRADING DASHBOARD FILES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FILE 3: src/hook/useTradingRealtimeSocket.ts
 * ──────────────────────────────────────────────
 * Hook to connect to /trading namespace (already exists)
 * 
 * 
 * FILE 4: src/store/tradingRealtimeSocketStore.ts
 * ────────────────────────────────────────────────
 * 
 * WHAT IT DOES:
 *   - Manages connection to ws://localhost:3001/trading
 *   - Stores latest trades, prices, order books
 *   - Provides listener system for real-time updates
 * 
 * STATE:
 *   - isConnected: boolean
 *   - isReconnecting: boolean
 *   - socket: Socket instance
 *   - subscribedSymbols: Set<string>
 *   - latestTrades: Record<symbol, trades[]>
 *   - latestPrices: Record<symbol, priceData>
 *   - latestOrderBooks: Record<symbol, orderBook>
 * 
 * ACTIONS:
 *   - connect(): Connect to /trading namespace
 *   - disconnect(): Close connection
 *   - subscribeSymbol(symbol, accountId): Subscribe to updates
 *   - unsubscribeSymbol(symbol): Stop listening
 * 
 * LISTENERS (return unsubscribe function):
 *   - onTradeMatched(callback): Listen to trade_matched events
 *   - onPriceUpdate(callback): Listen to price_update events
 *   - onOrderBookUpdate(callback): Listen to order_book_update events
 *   - onMyOrderMatched(callback): Listen to my_order_matched events
 */

/**
 * FILE 2: src/hook/useTradingRealtimeSocket.ts
 * ──────────────────────────────────────────────
 * 
 * WHAT IT DOES:
 *   - Hook wrapper around tradingRealtimeSocketStore
 *   - Auto-connects on component mount
 *   - Auto-subscribes to symbols
 *   - Simplifies integration in React components
 * 
 * USAGE:
 *   const { onTradeMatched, isConnected, latestTrades } = 
 *     useTradingRealtimeSocket({
 *       symbols: ['BTC/USD', 'ETH/USD'],
 *       accountId: 'user-account-123',
 *       autoConnect: true
 *     });
 */

/**
 * FILE 3: src/components/examples/TradingRealtimeDashboard.tsx
 * ─────────────────────────────────────────────────────────────
 * 
 * WHAT IT DOES:
 *   - Example component showing how to use trading realtime socket
 *   - Displays trades, prices, order matches
 *   - Real-time updates as events arrive
 * 
 * HOW TO USE:
 *   <TradingRealtimeDashboard symbol="BTC/USD" accountId={userId} />
 */

/**
 * PART 3: INTEGRATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * SCENARIO 1: Candlestick Chart (Most Common)
 * ─────────────────────────────────────────────
 * 
 * Use useCandlestickData hook + CandlestickChart component
 * 
 * Step 1: Add to your page
 * 
 *   import { CandlestickChart } from '@/components/examples/CandlestickChart';
 * 
 *   export default function ChartPage() {
 *     return (
 *       <div>
 *         <CandlestickChart symbol="BTC/USD" timeframe={3600} />
 *       </div>
 *     );
 *   }
 * 
 * 
 * Step 2: What happens automatically
 * 
 *   ✅ Load initial candles: GET /market-data/candles?symbol=BTC/USD&timeframe=3600
 *   ✅ Connect to kline socket (default namespace /)
 *   ✅ Subscribe to BTC/USD 1h candles
 *   ✅ Listen for kline events
 *   ✅ Update chart when new candles arrive
 * 
 * 
 * Step 3: (Optional) Use hook directly for custom chart
 * 
 *   import { useCandlestickData } from '@/hook/useCandlestickData';
 * 
 *   export const MyCustomChart = ({ symbol }: { symbol: string }) => {
 *     const { 
 *       candles,
 *       isLoading,
 *       isConnected,
 *       currentCandle,
 *       error 
 *     } = useCandlestickData({
 *       symbol,
 *       timeframe: 3600,
 *       autoLoad: true,
 *       autoConnect: true
 *     });
 * 
 *     if (isLoading) return <div>Loading chart...</div>;
 *     if (error) return <div>Error: {error}</div>;
 *     
 *     return (
 *       <div>
 *         <div>Total candles: {candles.length}</div>
 *         <div>Current: ${currentCandle?.close.toFixed(2)}</div>
 *         <div>Status: {isConnected ? '✅ Live' : '❌ Offline'}</div>
 * 
 *         {/* Render candles with your charting library */}
 *         {candles.map(c => (
 *           <div key={c.timestamp}>
 *             ${c.open} → ${c.close}
 *           </div>
 *         ))}
 *       </div>
 *     );
 *   };
 * 
 * 
 * BACKEND DATA FLOW FOR CANDLESTICKS:
 * 
 * Initial Load (API):
 *   GET /market-data/candles?symbol=BTC/USD&timeframe=3600
 *   ↓ Returns historical candles
 * 
 * Real-time Updates (WebSocket):
 *   OrderMatchingService.match()
 *     ↓ calls MarketDataService.recordTrade()
 *     ↓ (saves trade to DB/Redis)
 *     ↓ emit kline event to default namespace /
 *     ↓ FE receives via klineSocketStore
 *     ↓ Update chart with new/updated candle
 */

/**
 * SCENARIO 2: Trading Dashboard Component
 * ────────────────────────────────────────
 * 
 * Use useTradingRealtimeSocket hook + TradingDashboardNew component
 * 
 * Step 1: Add to your page
 * 
 *   import { TradingDashboard } from '@/components/examples/TradingDashboardNew';
 * 
 *   export default function TradingPage() {
 *     const user = useUserStore();
 *     return (
 *       <TradingDashboard 
 *         symbol="BTC/USD" 
 *         accountId={user.id}
 *       />
 *     );
 *   }
 * 
 * 
 * Step 2: Import hook directly
 * 
 *   import { useTradingRealtimeSocket } from '@/hook/useTradingRealtimeSocket';
 * 
 *   export const TradingDashboard = () => {
 *     const { 
 *       onTradeMatched,
 *       onPriceUpdate,
 *       onMyOrderMatched,
 *       isConnected,
 *       latestTrades,
 *       latestPrices
 *     } = useTradingRealtimeSocket({
 *       symbols: ['BTC/USD', 'ETH/USD'],
 *       accountId: userStore.accountId,
 *       autoConnect: true // connects on mount
 *     });
 * 
 * 
 * Step 3: Listen to real-time events
 * 
 *     useEffect(() => {
 *       return onTradeMatched((trade) => {
 *         console.log('New trade:', trade);
 *         // trade = { id, symbol, price, quantity, side, timestamp, ... }
 *         // Update UI
 *       });
 *     }, [onTradeMatched]);
 * 
 *     useEffect(() => {
 *       return onPriceUpdate((price) => {
 *         console.log('Price updated:', price);
 *         // price = { symbol, lastPrice, bid, ask, bidSize, askSize, timestamp }
 *         // Update price display
 *       });
 *     }, [onPriceUpdate]);
 * 
 *     useEffect(() => {
 *       return onMyOrderMatched((match) => {
 *         console.log('Order matched:', match);
 *         // match = { orderId, symbol, matchedPrice, matchedQuantity, side, timestamp }
 *         // Show notification
 *       });
 *     }, [onMyOrderMatched]);
 * 
 * 
 * Step 4: Display data
 * 
 *     return (
 *       <div>
 *         <div>
 *           Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}
 *         </div>
 *         
 *         <div>
 *           Latest Price: ${latestPrices['BTC/USD']?.lastPrice}
 *         </div>
 *         
 *         <div>
 *           Recent Trades:
 *           {latestTrades['BTC/USD']?.map(trade => (
 *             <div key={trade.id}>
 *               {trade.side} {trade.quantity} @ ${trade.price}
 *             </div>
 *           ))}
 *         </div>
 *       </div>
 *     );
 *   };
 */

/**
 * SCENARIO 2: Order History / Trade List Component
 * ──────────────────────────────────────────────────
 * 
 *   export const TradeHistory = ({ symbol }: { symbol: string }) => {
 *     const [trades, setTrades] = useState<TradeEvent[]>([]);
 *     
 *     const { onTradeMatched } = useTradingRealtimeSocket({
 *       symbols: [symbol],
 *     });
 *     
 *     useEffect(() => {
 *       return onTradeMatched((trade) => {
 *         setTrades(prev => [trade, ...prev].slice(0, 100)); // Keep latest 100
 *       });
 *     }, [onTradeMatched]);
 *     
 *     return (
 *       <table>
 *         <thead>
 *           <tr>
 *             <th>Time</th>
 *             <th>Side</th>
 *             <th>Price</th>
 *             <th>Qty</th>
 *           </tr>
 *         </thead>
 *         <tbody>
 *           {trades.map(t => (
 *             <tr key={t.id}>
 *               <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
 *               <td className={t.side === 'BUY' ? 'text-green' : 'text-red'}>
 *                 {t.side}
 *               </td>
 *               <td>${t.price}</td>
 *               <td>{t.quantity}</td>
 *             </tr>
 *           ))}
 *         </tbody>
 *       </table>
 *     );
 *   };
 */

/**
 * SCENARIO 3: Order Matching Notification
 * ──────────────────────────────────────────
 * 
 *   export const OrderNotification = ({ accountId }: { accountId: string }) => {
 *     const [matchedOrders, setMatchedOrders] = useState([]);
 *     
 *     const { onMyOrderMatched } = useTradingRealtimeSocket({
 *       symbols: ['BTC/USD', 'ETH/USD'],
 *       accountId, // Only receive events for this account
 *     });
 *     
 *     useEffect(() => {
 *       return onMyOrderMatched((match) => {
 *         // Show toast/notification
 *         showNotification(`Your order matched! ${match.side} ${match.matchedQuantity} @ $${match.matchedPrice}`);
 *         
 *         // Add to history
 *         setMatchedOrders(prev => [match, ...prev]);
 *       });
 *     }, [onMyOrderMatched]);
 *     
 *     return (
 *       <div>
 *         {matchedOrders.slice(0, 5).map(m => (
 *           <Notification key={m.orderId} match={m} />
 *         ))}
 *       </div>
 *     );
 *   };
 */

/**
 * PART 4: EXISTING SOCKET STORES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * KLINE SOCKET (Candlesticks)
 * ──────────────────────────────
 * Store: src/store/klineSocketStore.ts
 * URL: ws://localhost:3001
 * Usage:
 * 
 *   import { useKlineSocketStore } from '@/store/klineSocketStore';
 *   
 *   const { connect, subscribe, listeners } = useKlineSocketStore();
 *   
 *   useEffect(() => {
 *     connect();
 *     subscribe('BTC/USD', 3600); // symbol, timeframe in seconds
 *   }, []);
 * 
 * 
 * MARKET SOCKET (Prices)
 * ───────────────────────
 * Store: src/store/marketSocketStore.ts
 * URL: ws://localhost:3001
 * Usage:
 * 
 *   import { useMarketSocketStore } from '@/store/marketSocketStore';
 *   
 *   const { connect, subscribeSymbols, rtBySymbol } = useMarketSocketStore();
 *   
 *   useEffect(() => {
 *     connect();
 *     subscribeSymbols(['BTC/USD', 'ETH/USD']);
 *   }, []);
 */

/**
 * PART 5: ENVIRONMENT VARIABLES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * File: .env (already configured)
 * 
 * NEXT_PUBLIC_SOCKET_CHART_URL=ws://localhost:3001
 * NEXT_PUBLIC_API_CHART_URL=http://localhost:3001
 * NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
 * NEXT_PUBLIC_WS_ORDER_URL=ws://localhost:3001/ws/
 * 
 * These are used by:
 * - tradingRealtimeSocketStore: connects to ${SOCKET_CHART_URL}/trading
 * - klineSocketStore: connects to ${SOCKET_CHART_URL}
 * - marketSocketStore: connects to ${SOCKET_CHART_URL}
 */

/**
 * PART 6: EVENT TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * trade_matched event
 * ────────────────────
 * When a trade happens on the exchange
 * 
 * {
 *   id: string;              // unique trade ID
 *   symbol: string;          // 'BTC/USD'
 *   price: number;           // executed price
 *   quantity: number;        // executed quantity
 *   side: 'BUY' | 'SELL';   // side from taker's perspective
 *   timestamp: number;       // unix timestamp
 *   buyerAccountId?: string;
 *   sellerAccountId?: string;
 *   buyOrderId?: string;
 *   sellOrderId?: string;
 * }
 */

/**
 * price_update event
 * ──────────────────
 * Real-time price update
 * 
 * {
 *   symbol: string;          // 'BTC/USD'
 *   lastPrice: number;       // last trade price
 *   bid: number;             // best bid price
 *   ask: number;             // best ask price
 *   bidSize: number;         // size at bid
 *   askSize: number;         // size at ask
 *   timestamp: number;       // when this snapshot was taken
 * }
 */

/**
 * order_book_update event
 * ───────────────────────
 * Order book snapshot
 * 
 * {
 *   symbol: string;
 *   bids: Array<[price: number, quantity: number]>;
 *   asks: Array<[price: number, quantity: number]>;
 *   timestamp: number;
 * }
 */

/**
 * my_order_matched event
 * ──────────────────────
 * When user's order gets matched
 * 
 * {
 *   orderId: string;
 *   symbol: string;
 *   matchedPrice: number;
 *   matchedQuantity: number;
 *   side: 'BUY' | 'SELL';
 *   counterpartyOrderId?: string;
 *   timestamp: number;
 * }
 */

/**
 * PART 7: DEBUGGING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CHECK 2 SEPARATE WEBSOCKET CONNECTIONS
 * ───────────────────────────────────────
 * 
 * Your frontend should have 2 active WebSocket connections:
 * 
 *   1. Default namespace /
 *      URL: ws://localhost:3001
 *      Events: kline (candlesticks)
 *      Store: klineSocketStore
 *      
 *   2. /trading namespace
 *      URL: ws://localhost:3001/trading
 *      Events: trade_matched, price_update, order_book_update, my_order_matched
 *      Store: tradingRealtimeSocketStore
 * 
 * 
 * CHECK IN BROWSER DEVTOOLS
 * ─────────────────────────
 * 
 *   Step 1: Open DevTools → Network tab
 *   
 *   Step 2: Filter by WS (WebSocket)
 *   
 *   You should see 2 connections:
 *   ✅ ws://localhost:3001 (default namespace, for kline events)
 *   ✅ ws://localhost:3001/trading (trading namespace, for trade/price events)
 * 
 * 
 *   Step 3: Click on default namespace ws://localhost:3001
 *   
 *   Go to Messages tab:
 *   - Should see outgoing: subscribe_kline messages
 *   - Should see incoming: kline messages with candlestick data
 *   
 *     Example incoming message:
 *     {
 *       "type": "kline",
 *       "data": {
 *         "symbol": "BTC/USD",
 *         "timeframe": 3600,
 *         "open": 45000,
 *         "high": 45200,
 *         "low": 44900,
 *         "close": 45150,
 *         "volume": 12.34,
 *         "timestamp": 1234567890
 *       }
 *     }
 * 
 * 
 *   Step 4: Click on /trading namespace ws://localhost:3001/trading
 *   
 *   Go to Messages tab:
 *   - Should see outgoing: subscribe_symbol messages
 *   - Should see incoming: trade_matched, price_update messages
 *   
 *     Example trade_matched message:
 *     {
 *       "type": "trade_matched",
 *       "data": {
 *         "id": "trade-123",
 *         "symbol": "BTC/USD",
 *         "price": 45150,
 *         "quantity": 0.5,
 *         "side": "BUY",
 *         "timestamp": 1234567890
 *       }
 *     }
 * 
 * 
 * CHECK JAVASCRIPT CONSOLE
 * ────────────────────────
 * 
 *   // Check kline socket
 *   const klineStore = useKlineSocketStore.getState();
 *   console.log('Kline connected:', klineStore.isConnected);
 *   console.log('Kline data:', klineStore.klineData);
 * 
 *   // Check trading socket
 *   const tradingStore = useTradingRealtimeSocketStore.getState();
 *   console.log('Trading connected:', tradingStore.isConnected);
 *   console.log('Latest trades:', tradingStore.latestTrades);
 *   console.log('Latest prices:', tradingStore.latestPrices);
 * 
 * 
 * CHECK BACKEND LOGS
 * ──────────────────
 * 
 *   When order matches, you should see:
 * 
 *   ✅ [OrderMatchingService] Order matched! Buy: 0.5 BTC @ $45,150
 *   ✅ [MarketDataService] Trade recorded: BTC/USD, emit kline to /
 *   ✅ [TradingEventsListener] ORDER_MATCHED event, emit to /trading
 *   ✅ [RealtimeGateway] Broadcast trade_matched to /trading namespace
 *   ✅ [KlineGateway] Emit kline event to / namespace
 * 
 * 
 * TROUBLESHOOTING
 * ───────────────
 * 
 *   Problem: No candlesticks showing in chart
 *   Solution:
 *     ✅ Check if GET /market-data/candles returns data
 *     ✅ Check if klineSocketStore is connected (Network → WS → default /)
 *     ✅ Check if kline events are arriving (WebSocket Messages tab)
 *     ✅ Check backend is emitting kline events from MarketDataService
 * 
 * 
 *   Problem: No trade_matched events showing
 *   Solution:
 *     ✅ Check if /trading namespace is connected (Network → WS → /trading)
 *     ✅ Check if trade_matched events are arriving (WebSocket Messages tab)
 *     ✅ Check backend is emitting ORDER_MATCHED event
 *     ✅ Check TradingEventsListener is catching events
 */

/**
 * PART 8: TESTING FLOW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. Start backend:
 *    cd d:\launch-be
 *    npm run start:dev
 *    
 *    Wait for logs showing:
 *    ✅ [MarketMaker] 🤖 Generating market orders...
 *    ✅ OrderMatchingService initialized
 *    ✅ MarketDataService initialized
 *    ✅ KlineGateway listening on / namespace
 *    ✅ RealtimeGateway listening on /trading namespace
 * 
 * 
 * 2. Start FE:
 *    cd d:\rwa-fe
 *    npm run dev
 *    
 *    Open http://localhost:3000 in browser
 * 
 * 
 * 3. ADD CANDLESTICK CHART TO A PAGE:
 *    
 *    import { CandlestickChart } from '@/components/examples/CandlestickChart';
 *    
 *    export default function ChartPage() {
 *      return (
 *        <div>
 *          <h1>Trading Chart</h1>
 *          <CandlestickChart symbol="BTC/USD" timeframe={3600} />
 *        </div>
 *      );
 *    }
 *    
 *    Expected behavior:
 *    - Component mounts
 *    - "Loading candlesticks..." message appears
 *    - GET /market-data/candles request sent
 *    - Historical candles load (3-5 seconds typically)
 *    - Chart renders with candlesticks
 *    - Connection status changes to "✅ Live"
 *    - As new trades happen, chart updates with new candles
 * 
 * 
 * 4. ADD TRADING DASHBOARD TO ANOTHER PAGE:
 *    
 *    import { TradingDashboard } from '@/components/examples/TradingDashboardNew';
 *    
 *    export default function TradingPage() {
 *      const user = useUserStore();
 *      return (
 *        <div>
 *          <h1>Trading Dashboard</h1>
 *          <TradingDashboard symbol="BTC/USD" accountId={user.id} />
 *        </div>
 *      );
 *    }
 *    
 *    Expected behavior:
 *    - Component mounts
 *    - Connects to /trading namespace
 *    - Shows "✅ Connected to /trading"
 *    - Recent trades table appears (empty initially)
 *    - Price board updates when price_update events arrive
 *    - Trades list updates when trade_matched events arrive
 *    - My matched orders section shows when your orders match
 * 
 * 
 * 5. MONITOR WEBSOCKET TRAFFIC:
 *    
 *    Open browser DevTools → Network tab:
 *    
 *    You should see 2 WebSocket connections:
 *    
 *    Connection 1: ws://localhost:3001
 *    - Filter: WS
 *    - Name: localhost:3001
 *    - Status: 101 (WebSocket connection established)
 *    - Frames: kline messages arriving
 *    
 *    Connection 2: ws://localhost:3001/trading
 *    - Filter: WS
 *    - Name: localhost:3001/trading
 *    - Status: 101
 *    - Frames: trade_matched, price_update messages arriving
 * 
 * 
 * 6. VERIFY FLOW:
 *    
 *    ✅ Backend: OrderMatchingService matches orders
 *    ✅ Backend: MarketDataService emits kline to / namespace
 *    ✅ Backend: TradingEventsListener catches ORDER_MATCHED
 *    ✅ Backend: RealtimeGateway emits trade_matched to /trading
 *    ✅ FE: Chart receives kline, updates candlesticks
 *    ✅ FE: Dashboard receives trade_matched, updates trades list
 *    ✅ FE: Both connections active and receiving events
 * 
 * 
 * EXPECTED RESULTS AFTER ~30 SECONDS:
 * 
 *   - Candlestick chart has 5-10 candles visible
 *   - Chart shows OHLCV data
 *   - Trading dashboard shows 20-50 recent trades
 *   - Price board displays bid/ask
 *   - Both components show "✅ Live" status
 *   - Real-time updates happen every 1-10 seconds (based on trade frequency)
 */

export {};
