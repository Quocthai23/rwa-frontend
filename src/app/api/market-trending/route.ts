// import { getAssets } from "@/services/assetsService";
import { getTrendingMarket } from '@/services/marketService';

export async function GET() {
  const assets = await getTrendingMarket();
  return Response.json({ data: assets });
}
