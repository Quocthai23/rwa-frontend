export function demoOrderContext(input: {
  demo: boolean;
  online: boolean;
  connected: boolean;
  reconnecting: boolean;
  limit: boolean;
  bid: number;
  ask: number;
  publicPrice: number;
}) {
  const fallback =
    input.demo && Number.isFinite(input.publicPrice) && input.publicPrice > 0
      ? input.publicPrice
      : 0;
  return {
    canTrade:
      input.online && (input.demo || input.limit || (input.connected && !input.reconnecting)),
    bid: input.bid > 0 ? input.bid : fallback,
    ask: input.ask > 0 ? input.ask : fallback,
  };
}
