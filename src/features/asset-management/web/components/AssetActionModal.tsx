import { useTranslation } from 'react-i18next';
import { Asset } from '@/types/assets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  checkEligibility,
  createProposal,
  getBuyoutQuote,
  type BuyoutQuote,
} from '@/services/assetManagementService';

interface AssetActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  type: 'RENTAL' | 'BUYOUT';
}

interface BuyoutEligibility {
  eligible: boolean;
  reason?: string;
  currentHolding?: string;
  requiredCurrentHolding?: string;
}

const BUYOUT_BANDS = [
  { months: 6, min: 3, max: 5 },
  { months: 12, min: 5, max: 8 },
  { months: 18, min: 7, max: 11 },
  { months: 24, min: 9, max: 14 },
  { months: 36, min: 13, max: 20 },
  { months: 48, min: 17, max: 26 },
] as const;

export default function AssetActionModal({ isOpen, onClose, asset, type }: AssetActionModalProps) {
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<BuyoutEligibility | null>(null);
  const [durationMonths, setDurationMonths] = useState(12);
  const [premiumPercent, setPremiumPercent] = useState(6.5);
  const [quote, setQuote] = useState<BuyoutQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  useEffect(() => {
    if (isOpen && asset && type === 'BUYOUT') {
      checkEligibility(asset.id)
          .then((res) => setEligibility(res))
          .catch(() =>
            setEligibility({
              eligible: false,
              reason: 'Unable to verify buyout eligibility. Please try again.',
            }),
          );
    } else {
      setEligibility(null);
    }
  }, [isOpen, asset, type]);

  useEffect(() => {
    if (!isOpen || !asset || type !== 'BUYOUT' || eligibility?.eligible !== true) return;
    let active = true;
    setIsQuoteLoading(true);
    getBuyoutQuote(asset.id, durationMonths, premiumPercent)
      .then((result) => active && setQuote(result))
      .catch((error) => active && setActionError(error instanceof Error ? error.message : String(error)))
      .finally(() => active && setIsQuoteLoading(false));
    return () => { active = false; };
  }, [asset, durationMonths, eligibility?.eligible, isOpen, premiumPercent, type]);

  if (!asset) return null;

  const imageUrl =
    asset.images?.find((img: { isPrimary?: boolean }) => img.isPrimary)?.url ||
    asset.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  const currentHolding = Number(eligibility?.currentHolding ?? 0);
  const requiredCurrentHolding = Number(eligibility?.requiredCurrentHolding ?? 0);
  const holdingProgress =
    requiredCurrentHolding > 0
      ? Math.min(100, Math.max(0, (currentHolding / requiredCurrentHolding) * 100))
      : eligibility?.eligible
        ? 100
        : 0;
  const premiumBand =
    BUYOUT_BANDS.find((item) => item.months === durationMonths) ?? BUYOUT_BANDS[1];
  const formatVnd = (value?: string) =>
    new Intl.NumberFormat(i18n.language || 'vi-VN', {
      style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
  const formatNumber = (value?: string, digits = 4) =>
    new Intl.NumberFormat(i18n.language || 'vi-VN', {
      maximumFractionDigits: digits,
    }).format(Number(value ?? 0));

  const changeDuration = (months: number) => {
    const next = BUYOUT_BANDS.find((item) => item.months === months) ?? BUYOUT_BANDS[1];
    setDurationMonths(months);
    setPremiumPercent((next.min + next.max) / 2);
  };

  const handleAction = async () => {
    if (type === 'RENTAL') return;
    setActionError(null);
    setIsProcessing(true);
    try {
      if (type === 'BUYOUT') {
        if (!quote) throw new Error('buyout-quote-is-not-ready');
        await createProposal(asset.id, {
          title: t('assetManagement.buyout.proposalTitle', {
            defaultValue: 'Buyout proposal for {{symbol}}', symbol: asset.symbol,
          }),
          description: t('assetManagement.buyout.proposalDescription', {
            defaultValue: 'Acquire remaining tokens over {{months}} months with a {{premium}}% total premium and monthly record dates.',
            months: durationMonths, premium: premiumPercent,
          }),
          durationMonths,
          premiumPercent,
        });
      }
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to process action', error);
      setActionError(error instanceof Error ? error.message : 'Unable to submit this request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setActionError(null);
    setQuote(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 max-h-[92vh] overflow-y-auto rounded-3xl p-0 shadow-2xl sm:max-w-2xl">
        <div className="relative h-32 w-full">
          <Image src={imageUrl} alt={asset.name} fill className="object-cover" />
          <div
            className={cn(
              'absolute inset-0 opacity-80',
              type === 'RENTAL'
                ? 'bg-gradient-to-t from-green-900/90 to-transparent'
                : type === 'BUYOUT'
                  ? 'bg-gradient-to-t from-yellow-900/90 to-transparent'
                  : 'bg-gradient-to-t from-blue-900/90 to-transparent',
            )}
          />
        </div>

        <div className="space-y-4 px-6 py-4">
          <DialogHeader className="relative z-10 -mt-12">
            <DialogTitle className="mb-2 text-2xl font-bold text-white">
              {type === 'RENTAL'
                ? t('assetManagement.rental.title', { defaultValue: 'Rental NFT' })
                : t('assetManagement.buyout.title', { defaultValue: 'Buyout Request' })}
            </DialogTitle>
            <DialogDescription className="text-foreground/80 mt-2">
              <span className="text-foreground mb-1 block text-base font-bold">
                {asset.symbol} - {asset.name}
              </span>
              {type === 'RENTAL'
                ? t('assetManagement.rental.desc', {
                    defaultValue:
                      'Deposit 1 month rent to mint a Rental NFT and start earning yields.',
                  })
                : t('assetManagement.buyout.desc', {
                    defaultValue:
                      'Meet the current ownership threshold and the minimum continuous-holding period to propose a buyout.',
                  })}
            </DialogDescription>
          </DialogHeader>

          {!isSuccess ? (
            <div className="bg-muted/50 space-y-3 rounded-xl p-4">
              {type === 'RENTAL' ? (
                <>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t('assetManagement.rental.unavailableReason', {
                      defaultValue:
                        'Rental minting will open after the payment escrow and KMS-backed RentalNFT contract are configured.',
                    })}
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('assetManagement.holdingProgress', { defaultValue: 'Control holding' })}
                      </span>
                      <span className="font-bold text-yellow-500">
                        {eligibility
                          ? `${eligibility.currentHolding ?? '0'} / ${eligibility.requiredCurrentHolding ?? '—'} tokens`
                          : '...'}
                      </span>
                    </div>
                    <div className="bg-muted-foreground/20 h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${holdingProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground text-sm">{t('assetManagement.buyout.status', { defaultValue: 'Status' })}</span>
                    <span
                      className={cn(
                        'font-bold',
                        eligibility?.eligible ? 'text-emerald-500' : 'text-amber-500',
                      )}
                    >
                      {eligibility
                        ? eligibility.eligible
                          ? t('assetManagement.buyout.eligible', { defaultValue: 'Eligible' })
                          : eligibility.reason
                        : t('assetManagement.buyout.checking', { defaultValue: 'Checking...' })}
                    </span>
                  </div>
                  {eligibility?.eligible && (
                    <div className="border-border/60 mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium">
                        <span>{t('assetManagement.buyout.duration', { defaultValue: 'Acquisition period' })}</span>
                        <select value={durationMonths} onChange={(event) => changeDuration(Number(event.target.value))} className="bg-background border-input text-foreground h-11 w-full rounded-xl border px-3">
                          {BUYOUT_BANDS.map((item) => <option key={item.months} value={item.months}>{t('assetManagement.buyout.monthCount', { defaultValue: '{{count}} months', count: item.months })}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        <span className="flex justify-between"><span>{t('assetManagement.buyout.totalPremium', { defaultValue: 'Total premium' })}</span><strong className="text-amber-600 dark:text-amber-400">{premiumPercent}%</strong></span>
                        <input type="range" min={premiumBand.min} max={premiumBand.max} step="0.1" value={premiumPercent} onChange={(event) => setPremiumPercent(Number(event.target.value))} className="accent-amber-500 w-full" />
                        <span className="text-muted-foreground flex justify-between text-xs"><span>{premiumBand.min}%</span><span>{premiumBand.max}%</span></span>
                      </label>
                    </div>
                  )}
                  {eligibility?.eligible && (
                    <>
                      <div className="border-border/60 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3">
                        {[
                          [t('assetManagement.buyout.frozenPrice', { defaultValue: 'Frozen base price' }), formatVnd(quote?.terms.unitPrice)],
                          [t('assetManagement.buyout.remainingTokens', { defaultValue: 'Remaining tokens' }), formatNumber(quote?.terms.minorityTokenAmount)],
                          [t('assetManagement.buyout.totalValue', { defaultValue: 'Total program value' }), formatVnd(quote?.terms.totalConsideration)],
                          [t('assetManagement.buyout.deposit', { defaultValue: 'Required deposit' }), formatVnd(quote?.terms.depositAmount)],
                          [t('assetManagement.buyout.monthlyWaitingRate', { defaultValue: 'Monthly waiting rate' }), `${formatNumber(quote?.terms.monthlyWaitingRatePercent, 6)}%`],
                          [t('assetManagement.buyout.firstPayment', { defaultValue: 'Estimated first payment' }), formatVnd(quote?.terms.firstMonthlyPayment)],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-card p-3">
                            <p className="text-muted-foreground text-xs">{label}</p>
                            <p className="mt-1 text-sm font-bold">{isQuoteLoading ? '...' : value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="border-amber-500/30 bg-amber-500/10 text-muted-foreground mt-4 rounded-xl border p-3 text-xs leading-5">
                        {t('assetManagement.buyout.protectionNotice', { defaultValue: 'Only the acquirer is locked from trading. Other holders may trade normally; monthly rights belong to the token owner at each record date.' })}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-bold">{t('assetManagement.buyout.submitted', { defaultValue: 'Proposal submitted' })}</p>
              <p className="text-muted-foreground text-center text-sm">
                {type === 'RENTAL'
                  ? t('assetManagement.successRental')
                  : t('assetManagement.buyout.voteRestartNotice', { defaultValue: 'Minority holders have 7 days to vote. A revised proposal restarts the full voting window.' })}
              </p>
            </div>
          )}
          {actionError && (
            <p className="text-sm text-red-500" role="alert">
              {actionError}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-stretch">
          {!isSuccess ? (
            <Button
              className={cn(
                'h-12 w-full rounded-xl text-base font-bold',
                type === 'RENTAL'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-yellow-500 text-black hover:bg-yellow-600',
              )}
              onClick={handleAction}
              disabled={
                isProcessing ||
                isQuoteLoading ||
                !quote ||
                type === 'RENTAL' ||
                (type === 'BUYOUT' && eligibility?.eligible !== true)
              }
            >
              {isProcessing
                ? t('assetManagement.processing')
                : type === 'RENTAL'
                  ? t('assetManagement.rental.unavailable', { defaultValue: 'Unavailable' })
                  : t('assetManagement.buyout.submitVote', { defaultValue: 'Submit for 7-day vote' })}
            </Button>
          ) : (
            <Button
              variant="neutral-outline"
              className="h-12 w-full rounded-xl font-bold"
              onClick={handleClose}
            >
              {t('assetManagement.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
