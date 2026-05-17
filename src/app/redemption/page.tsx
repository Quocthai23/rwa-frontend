'use client';

import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { getAssets } from '@/services/assetsService';
import { redemptionApi, type RedemptionRequest } from '@/services/redemptionService';
import type { Asset } from '@/types/assets';
import { File02, AlertCircle, CheckCircle, RefreshCcw01, ArrowRight } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RedemptionPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock holdings data: let's say the user owns a substantial chunk of LND-01 but not 100%
  // unless they toggle a "Simulation mode" for demonstration!
  const [userHoldingsPercent, setUserHoldingsPercent] = useState(78.5);

  useEffect(() => {
    async function loadData() {
      try {
        const allAssets = await getAssets();
        setAssets(allAssets);
        if (allAssets.length > 0) {
          setSelectedAsset(allAssets[0]);
        }
      } catch (err) {
        console.error('Failed to load assets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;
    const assetId = selectedAsset.id;
    async function loadRedemptions() {
      try {
        const list = await redemptionApi.getMyRedemptions(assetId);
        setRedemptions(list);
      } catch (err) {
        console.error('Failed to load redemptions:', err);
      }
    }
    loadRedemptions();
  }, [selectedAsset]);

  const handleRequestRedemption = async () => {
    if (!selectedAsset) return;
    if (userHoldingsPercent < 100) {
      showError('Ineligible for Redemption', 'Asset redemption requires ownership of 100% of the total token supply to liquidate custody.');
      return;
    }

    try {
      const response = await redemptionApi.requestRedeem(selectedAsset.id);
      setRedemptions((prev) => [response, ...prev]);
      showSuccess(
        'Redemption Requested!',
        'Your request to claim physical deed custody has been filed. Our legal division will contact you shortly.'
      );
    } catch (err) {
      showError('Redemption Request Failed', 'An error occurred while submitting your custody request.');
    }
  };

  const handleToggleSimulation = () => {
    setUserHoldingsPercent((prev) => (prev === 100 ? 78.5 : 100));
    showSuccess(
      'Holdings State Modified',
      `Holdings simulated at ${userHoldingsPercent === 100 ? '78.5%' : '100% (Eligible)'}.`
    );
  };

  if (loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="border-primary-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col min-h-screen">
      <Header label="RWA Asset Redemption" onBack={() => router.push('/more')} />

      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* Banner with premium glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-emerald-950 to-indigo-950 p-6 text-white shadow-xl border border-white/10 mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <File02 size={24} className="text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Custody Liquidation</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Physical Asset Redemption</h1>
            <p className="text-sm text-emerald-200 max-w-xl">
              Acquire 100% of a real-world asset token supply to reclaim complete legal deed ownership and physical control of the underlying property.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none">
            <File02 size={200} />
          </div>
        </div>

        {/* Asset Selector & Simulation switch */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Select Target Asset</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedAsset?.id === asset.id
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                      : 'bg-card border border-border hover:bg-muted text-foreground'
                  }`}
                >
                  {asset.symbol} - {asset.name}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleToggleSimulation}
            className="flex items-center gap-2 bg-muted hover:bg-card border border-border text-foreground rounded-xl"
          >
            <RefreshCcw01 size={16} />
            <span>Simulate 100% Ownership</span>
          </Button>
        </div>

        {selectedAsset && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Holdings Audit Card */}
            <div className="bg-card border border-border rounded-2xl p-6 md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-4">Ownership Audit Ledger</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-foreground">{userHoldingsPercent}%</span>
                  <span className="text-sm text-muted-foreground mb-1">of Total Supply</span>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all ${
                      userHoldingsPercent === 100
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                    }`}
                    style={{ width: `${userHoldingsPercent}%` }}
                  />
                </div>
              </div>

              {userHoldingsPercent < 100 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <span className="text-xs font-bold text-amber-500 block mb-1">Insufficient Holdings</span>
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed mb-3">
                      You must purchase the remaining {(100 - userHoldingsPercent).toFixed(1)}% of the {selectedAsset.symbol} supply to initiate redemption.
                    </p>
                    <button
                      onClick={() => router.push(`/trade/${selectedAsset.symbol}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:text-primary-600 transition-all"
                    >
                      <span>Buy remaining tokens on Spot Market</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-start">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <span className="text-xs font-bold text-emerald-500 block mb-1">Eligible for Custody Claim</span>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                      You hold 100% of the tokenized supply of {selectedAsset.name}. You are fully eligible to lock your tokens and receive physical property custody.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Card */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Initiate Custody Transfer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submitting a redemption claim will lock 100% of the tokenized supply and launch legal dossier processing for ownership transfer.
                </p>
              </div>

              <Button
                disabled={userHoldingsPercent < 100}
                onClick={handleRequestRedemption}
                className={`w-full py-6 rounded-xl font-bold transition-all ${
                  userHoldingsPercent === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Request Custody Claim
              </Button>
            </div>
          </div>
        )}

        {/* Requests Logs */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Redemption Request History</h2>

          {redemptions.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
              No custody claims have been initiated for this asset yet.
            </div>
          ) : (
            redemptions.map((red) => (
              <div key={red.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-500/10 p-2 rounded-xl text-primary-500">
                    <File02 size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">Request ID: {red.id}</span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedAsset?.symbol} Custody Liquidation
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {new Date(red.requestedAt).toLocaleDateString()}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {red.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
