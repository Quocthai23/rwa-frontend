// import { getAssets } from "@/services/assetsService";
import { getTrendingData } from '@/services/marketService';

export async function GET() {
  const assets = await getTrendingData();
  return Response.json({ data: assets });
}
