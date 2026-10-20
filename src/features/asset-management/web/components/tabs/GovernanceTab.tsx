'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from '@untitledui/icons';

import { AssetManagementButton as Button } from '@/features/asset-management/web/components/AssetManagementButton';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import {
  useAssetProposals,
  useAssetStatus,
  useCreateRentalEnablementProposal,
  useBuyoutQuote,
  useCreateProposal,
  useCreateGovernanceProposal,
  useEligibility,
  useVoteProposal,
} from '@/hook/useAssetManagement';
import type { DaoProposal } from '@/services/daoService';
import type { Asset } from '@/types/assets';
import { formatBalance } from '@/utils/currency';
import { BuyoutEscrowActions } from '../BuyoutEscrowActions';
import { localizeApiError } from '@/i18n/apiErrors';
import {
  GovernanceTermsFields,
  emptyGovernanceTerms,
  governanceTermsPayload,
} from '../GovernanceTermsFields';

type VoteIntent = { proposalId: string; isFor: boolean; title: string } | null;
type ProposalKind =
  | 'GENERAL'
  | 'MAINTENANCE'
  | 'OPERATOR_CHANGE'
  | 'RENT_CHANGE'
  | 'ASSET_SALE'
  | 'BUYOUT'
  | 'RENTAL_ENABLEMENT';

const BUYOUT_BANDS = [
  { months: 6, min: 3, max: 5 },
  { months: 12, min: 5, max: 8 },
  { months: 18, min: 7, max: 11 },
  { months: 24, min: 9, max: 14 },
  { months: 36, min: 13, max: 20 },
  { months: 48, min: 17, max: 26 },
] as const;

export default function GovernanceTab({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation();
  const { data: eligibility, isLoading: loadingEligibility } = useEligibility(asset.id);
  const proposalsQuery = useAssetProposals(asset.id);
  const { data: proposals = [], isLoading: loadingProposals } = proposalsQuery;
  const createMutation = useCreateProposal(asset.id);
  const statusQuery = useAssetStatus(asset.id);
  const createRental = useCreateRentalEnablementProposal(asset.id);
  const openingVoteDays = Math.min(5, Math.max(3, Number(statusQuery.data?.rentalVoteDays ?? 3)));
  const [openedAt] = useState(() => Date.now());
  const activeLease = ['PENDING_FUNDING', 'ACTIVE', 'DELINQUENT', 'SUSPENDED'].includes(
    statusQuery.data?.rentalContract?.status ?? '',
  );
  const rentalOpened = Boolean(statusQuery.data?.rentalEnabledUntil || activeLease);
  const rentalEnabled =
    activeLease ||
    Boolean(
      statusQuery.data?.rentalEnabledUntil &&
      new Date(String(statusQuery.data.rentalEnabledUntil)).getTime() > openedAt,
    );
  const openingVote = proposals.some(
    (proposal) => proposal.type === 'RENTAL_ENABLEMENT' && proposal.status === 'ACTIVE',
  );
  const [terms, setTerms] = useState(emptyGovernanceTerms);
  const [purposes, setPurposes] = useState<string[]>(['COMMERCIAL']);
  const createGovernanceMutation = useCreateGovernanceProposal(asset.id);
  const voteMutation = useVoteProposal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [premiumPercent, setPremiumPercent] = useState(6.5);
  const [votingDays, setVotingDays] = useState(7);
  const [proposalKind, setProposalKind] = useState<ProposalKind>('GENERAL');
  const [voteIntent, setVoteIntent] = useState<VoteIntent>(null);

  const durationOptions = useMemo<number[]>(() => BUYOUT_BANDS.map((item) => item.months), []);
  const safeDuration = durationOptions.includes(durationMonths) ? durationMonths : 12;
  const premiumBand = BUYOUT_BANDS.find((item) => item.months === safeDuration) ?? BUYOUT_BANDS[1];
  const isBuyout = proposalKind === 'BUYOUT';
  const proposalKindLabels: Record<ProposalKind, string> = {
    GENERAL: t('assetManagement.createProposal.typeGeneral'),
    MAINTENANCE: t('assetManagement.createProposal.typeMaintenance'),
    OPERATOR_CHANGE: t('assetManagement.createProposal.typeOperatorChange'),
    RENT_CHANGE: t('assetManagement.createProposal.typeRentChange'),
    ASSET_SALE: t('assetManagement.createProposal.typeAssetSale'),
    BUYOUT: t('assetManagement.createProposal.typeBuyout'),
    RENTAL_ENABLEMENT: t('assetManagement.rentalOperations.openEnablementVote'),
  };
  const quoteQuery = useBuyoutQuote(asset.id, safeDuration, premiumPercent, isBuyout);
  const quote = quoteQuery.data;

  const current = Number(eligibility?.currentHolding ?? 0);
  const required = Number(eligibility?.requiredCurrentHolding ?? 0);
  const progress = required > 0 ? Math.min(100, (current / required) * 100) : 0;
  const reasonCode = eligibility?.reasonCode;
  const eligibilityReason = eligibility?.eligible
    ? t('assetManagement.eligibility.eligibleDescription')
    : reasonCode
      ? t(`assetManagement.eligibility.reasons.${reasonCode}`, {
          holding: formatBalance(required),
          months: eligibility?.holdingMonths ?? asset.buyoutHoldingMonths ?? 0,
          defaultValue: eligibility?.reason,
        })
      : t('assetManagement.eligibility.requirementsMissing');

  if (loadingEligibility || loadingProposals) return <Skeleton className="h-80 w-full" />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error(t('assetManagement.createProposal.required'));
      return;
    }
    const callbacks = {
      onSuccess: () => {
        toast.success(t('assetManagement.createProposal.successMsg'));
        setTitle('');
        setDescription('');
      },
      onError: (error: Error) =>
        toast.error(localizeApiError(error, t, 'assetManagement.createProposal.errorMsg')),
    };
    if (proposalKind === 'RENT_CHANGE' && !rentalOpened) return;
    if (proposalKind === 'RENTAL_ENABLEMENT') {
      if (rentalEnabled || openingVote) return;
      createRental.mutate(
        {
          title: title.trim(),
          expectedMonthlyRentVnd: terms.monthlyRentVnd,
          expectedDepositVnd: terms.depositVnd,
          allowedPurposeSectors: purposes,
          description: description.trim(),
        },
        callbacks,
      );
    } else if (isBuyout) {
      createMutation.mutate(
        {
          title: title.trim(),
          description: description.trim(),
          durationMonths: safeDuration,
          premiumPercent,
        },
        callbacks,
      );
    } else {
      createGovernanceMutation.mutate(
        {
          title: title.trim(),
          description: description.trim(),
          snapshotDate: new Date().toISOString(),
          endDate: new Date(Date.now() + votingDays * 24 * 60 * 60 * 1000).toISOString(),
          type: 'GENERAL' as const,
          category: proposalKind,
          ...governanceTermsPayload(proposalKind, terms),
        },
        callbacks,
      );
    }
  };

  const confirmVote = () => {
    if (!voteIntent) return;
    voteMutation.mutate(
      { proposalId: voteIntent.proposalId, payload: { isFor: voteIntent.isFor } },
      {
        onSuccess: () => {
          toast.success(t('assetManagement.votingList.voteSuccess'));
          setVoteIntent(null);
        },
        onError: () => toast.error(t('assetManagement.votingList.voteError')),
      },
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-foreground mb-3 text-base font-semibold">
          {t('assetManagement.governance.proposals')}
        </h2>
        {proposalsQuery.isError ? (
          <div className="border-border rounded-lg border p-5 text-sm text-amber-600">
            <p>
              {t('assetManagement.governance.loadError', {
                defaultValue: 'Unable to load proposals.',
              })}
            </p>
            <Button
              variant="neutral-outline"
              className="mt-3"
              onClick={() => proposalsQuery.refetch()}
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        ) : !Array.isArray(proposals) || proposals.length === 0 ? (
          <div className="border-border text-muted-foreground border border-dashed px-4 py-12 text-center text-sm">
            {t('assetManagement.votingList.noProposals')}
          </div>
        ) : (
          <div className="border-border border">
            {proposals.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                locale={i18n.language}
                onVote={(isFor) =>
                  setVoteIntent({ proposalId: proposal.id, isFor, title: proposal.title })
                }
                votePending={voteMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-foreground text-base font-semibold">
              {t('assetManagement.governance.eligibilityTitle')}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('assetManagement.governance.eligibilityDescription')}
            </p>
          </div>
          <span
            className={
              eligibility?.eligible
                ? 'text-sm font-medium text-emerald-600'
                : 'text-sm font-medium text-amber-600'
            }
          >
            {eligibility?.eligible
              ? t('assetManagement.eligibility.eligible')
              : t('assetManagement.eligibility.notEligible')}
          </span>
        </div>
        <div className="border-border mt-4 border p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Value
              label={t('assetManagement.governance.currentHolding')}
              value={`${formatBalance(current)} token`}
            />
            <Value
              label={t('assetManagement.governance.requiredHolding')}
              value={`${formatBalance(required)} token`}
            />
            <Value
              label={t('assetManagement.governance.continuousHolding')}
              value={`${eligibility?.holdingMonths ?? asset.buyoutHoldingMonths ?? 0} ${t('common.monthUnit')}`}
            />
          </div>
          <div className="bg-muted mt-4 h-1.5">
            <div className="bg-primary-500 h-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">{eligibilityReason}</p>
        </div>
      </section>

      <details className="group border-border overflow-hidden rounded-xl border">
        <summary className="text-foreground hover:bg-muted/30 flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown
            aria-hidden="true"
            size={18}
            className="text-muted-foreground shrink-0 group-open:hidden"
          />
          <ChevronUp
            aria-hidden="true"
            size={18}
            className="text-muted-foreground hidden shrink-0 group-open:block"
          />
          {t('assetManagement.createProposal.title')}
        </summary>
        <div className="border-border border-t p-4 sm:p-5">
          <p className="text-muted-foreground mb-4 text-sm">
            {t('assetManagement.createProposal.explanation')}
          </p>
          <form
            onSubmit={submit}
            className="border-border grid border lg:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label className="text-muted-foreground mb-1.5 block text-xs">
                  {t('assetManagement.createProposal.proposalType')}
                </label>
                <select
                  value={proposalKind}
                  onChange={(event) => {
                    const next = event.target.value as ProposalKind;
                    setProposalKind(next);
                    if (next === 'RENT_CHANGE')
                      setTerms((current) => ({
                        ...current,
                        monthlyRentVnd:
                          current.monthlyRentVnd ||
                          String(statusQuery.data?.rentalExpectedMonthlyVnd ?? ''),
                        depositVnd:
                          current.depositVnd ||
                          String(statusQuery.data?.rentalExpectedDepositVnd ?? ''),
                      }));
                  }}
                  className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
                >
                  <option value="GENERAL">{proposalKindLabels.GENERAL}</option>
                  <option value="MAINTENANCE">{proposalKindLabels.MAINTENANCE}</option>
                  <option value="OPERATOR_CHANGE">{proposalKindLabels.OPERATOR_CHANGE}</option>
                  {!rentalEnabled && (
                    <option
                      value="RENTAL_ENABLEMENT"
                      disabled={openingVote || statusQuery.isLoading}
                    >
                      {proposalKindLabels.RENTAL_ENABLEMENT}
                    </option>
                  )}
                  {rentalOpened && (
                    <option value="RENT_CHANGE">{proposalKindLabels.RENT_CHANGE}</option>
                  )}
                  <option value="ASSET_SALE">{proposalKindLabels.ASSET_SALE}</option>
                  <option value="BUYOUT" disabled={!eligibility?.eligible}>
                    {proposalKindLabels.BUYOUT}
                    {!eligibility?.eligible
                      ? ` — ${t('assetManagement.createProposal.buyoutLocked')}`
                      : ''}
                  </option>
                </select>
              </div>
              {openingVote && !rentalEnabled && (
                <p className="text-muted-foreground text-xs">
                  {t('assetManagement.terms.openingVoteInProgress')}
                </p>
              )}
              <GovernanceTermsFields kind={proposalKind} values={terms} onChange={setTerms} />
              {proposalKind === 'RENTAL_ENABLEMENT' && (
                <fieldset>
                  <legend className="text-muted-foreground mb-2 text-xs">
                    {t('assetManagement.rentalOperations.allowedPurposes')}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      'COMMERCIAL',
                      'HOSPITALITY',
                      'RESIDENTIAL',
                      'SERVICES',
                      'PRODUCTION',
                      'OTHER',
                    ].map((purpose) => (
                      <label key={purpose} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={purposes.includes(purpose)}
                          onChange={(event) =>
                            setPurposes((current) =>
                              event.target.checked
                                ? [...current, purpose]
                                : current.filter((item) => item !== purpose),
                            )
                          }
                        />
                        {t(`rentalPurposes.sectors.${purpose}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs">
                    {t('assetManagement.createProposal.proposalTitle')}
                  </label>
                  <Input
                    required
                    minLength={3}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('assetManagement.createProposal.proposalTitlePlaceholder')}
                    disabled={isBuyout && !eligibility?.eligible}
                    maxLength={160}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1.5 block text-xs">
                    {isBuyout
                      ? t('assetManagement.createProposal.durationMonths')
                      : t('assetManagement.createProposal.votingDays')}
                  </label>
                  <select
                    value={
                      isBuyout
                        ? safeDuration
                        : proposalKind === 'RENTAL_ENABLEMENT'
                          ? openingVoteDays
                          : votingDays
                    }
                    onChange={(event) =>
                      isBuyout
                        ? (() => {
                            const nextMonths = Number(event.target.value);
                            const nextBand =
                              BUYOUT_BANDS.find((item) => item.months === nextMonths) ??
                              BUYOUT_BANDS[1];
                            setDurationMonths(nextMonths);
                            setPremiumPercent((nextBand.min + nextBand.max) / 2);
                          })()
                        : setVotingDays(Number(event.target.value))
                    }
                    disabled={isBuyout && !eligibility?.eligible}
                    className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
                  >
                    {(isBuyout
                      ? durationOptions
                      : proposalKind === 'RENTAL_ENABLEMENT'
                        ? [openingVoteDays]
                        : [3, 7, 14, 30]
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item} {isBuyout ? t('common.monthUnit') : t('common.dayUnit')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {isBuyout && (
                <label className="block">
                  <span className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                    <span>{t('assetManagement.buyout.totalPremium')}</span>
                    <strong className="text-foreground">{premiumPercent}%</strong>
                  </span>
                  <input
                    type="range"
                    min={premiumBand.min}
                    max={premiumBand.max}
                    step="0.1"
                    value={premiumPercent}
                    onChange={(event) => setPremiumPercent(Number(event.target.value))}
                    className="accent-primary-500 w-full"
                  />
                  <span className="text-muted-foreground flex justify-between text-xs">
                    <span>{premiumBand.min}%</span>
                    <span>{premiumBand.max}%</span>
                  </span>
                </label>
              )}
              <div>
                <label className="text-muted-foreground mb-1.5 block text-xs">
                  {t('assetManagement.createProposal.description')}
                </label>
                <textarea
                  required
                  minLength={10}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('assetManagement.createProposal.descriptionPlaceholder')}
                  disabled={isBuyout && !eligibility?.eligible}
                  rows={7}
                  maxLength={proposalKind === 'RENTAL_ENABLEMENT' ? 2000 : 5000}
                  className="border-border bg-background text-foreground focus:border-primary-500 w-full rounded border p-3 text-sm outline-none"
                />
                <p className="text-muted-foreground mt-1 text-right text-xs">
                  {description.length}/{proposalKind === 'RENTAL_ENABLEMENT' ? 2000 : 5000}
                </p>
              </div>
              <div className="border-border border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  {t('assetManagement.createProposal.commitmentNotice')}
                </p>
                <Button
                  type="submit"
                  className="mt-3"
                  disabled={
                    (proposalKind === 'RENTAL_ENABLEMENT' &&
                      (rentalEnabled || openingVote || purposes.length === 0)) ||
                    (proposalKind === 'RENT_CHANGE' && !rentalOpened) ||
                    (isBuyout && !eligibility?.eligible) ||
                    (isBuyout && (quoteQuery.isLoading || quoteQuery.isError)) ||
                    createMutation.isPending ||
                    createGovernanceMutation.isPending ||
                    createRental.isPending
                  }
                >
                  {createMutation.isPending ||
                  createGovernanceMutation.isPending ||
                  createRental.isPending
                    ? t('assetManagement.createProposal.submitting')
                    : t('assetManagement.createProposal.submit')}
                </Button>
              </div>
            </div>

            <aside className="border-border bg-muted/20 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
              {!isBuyout ? (
                <>
                  <h3 className="text-foreground text-sm font-semibold">
                    {t('assetManagement.createProposal.generalFlowTitle')}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    {t('assetManagement.createProposal.generalFlowDescription')}
                  </p>
                  <div className="border-border mt-4 border-t pt-4 text-xs">
                    <p className="text-muted-foreground">
                      {t('assetManagement.createProposal.selectedType')}
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {proposalKindLabels[proposalKind]}
                    </p>
                    <p className="text-muted-foreground mt-4">
                      {t('assetManagement.createProposal.votingDays')}
                    </p>
                    <p className="text-foreground mt-1 font-medium">
                      {proposalKind === 'RENTAL_ENABLEMENT' ? openingVoteDays : votingDays}{' '}
                      {t('common.dayUnit')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-foreground text-sm font-semibold">
                    {t('assetManagement.createProposal.quoteTitle')}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t('assetManagement.createProposal.quoteDescription')}
                  </p>
                  {quoteQuery.isLoading ? (
                    <Skeleton className="mt-4 h-64 w-full" />
                  ) : quoteQuery.isError || !quote ? (
                    <p className="mt-4 text-xs text-amber-600">
                      {t('assetManagement.createProposal.quoteError')}
                    </p>
                  ) : (
                    <div className="border-border mt-4 divide-y border-y">
                      <Term
                        label={t('assetManagement.createProposal.remainingTokens')}
                        value={`${formatBalance(quote.terms.minorityTokenAmount)} token`}
                      />
                      <Term
                        label={t('assetManagement.createProposal.referenceUnitPrice')}
                        value={`${formatBalance(quote.terms.unitPrice)} VND`}
                      />
                      <Term
                        label={t('assetManagement.createProposal.premium')}
                        value={`${formatBalance(quote.terms.premiumPercent)}%`}
                      />
                      <Term
                        label={t('assetManagement.createProposal.totalCompensation')}
                        value={`${formatBalance(quote.terms.totalConsideration)} VND`}
                        strong
                      />
                      <Term
                        label={t('assetManagement.createProposal.requiredDeposit')}
                        value={`${formatBalance(quote.terms.depositAmount)} VND`}
                      />
                      <Term
                        label={t('assetManagement.createProposal.monthlyPayment')}
                        value={`${formatBalance(quote.terms.firstMonthlyPayment)} VND`}
                      />
                      <Term
                        label={t('assetManagement.buyout.monthlyWaitingRate')}
                        value={`${formatBalance(quote.terms.monthlyWaitingRatePercent)}%`}
                      />
                      <Term
                        label={t('assetManagement.createProposal.votingWindow')}
                        value={`${quote.votingWindowDays} ${t('common.dayUnit')}`}
                      />
                    </div>
                  )}
                </>
              )}
            </aside>
          </form>
        </div>
      </details>

      {voteIntent ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border-border w-full max-w-md border p-5 shadow-xl">
            <h3 className="text-foreground text-base font-semibold">
              {t('assetManagement.votingList.confirmTitle')}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">{voteIntent.title}</p>
            <p className="mt-4 text-sm font-medium">
              {voteIntent.isFor
                ? t('assetManagement.votingList.confirmYes')
                : t('assetManagement.votingList.confirmNo')}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              {t('assetManagement.votingList.irreversibleWarning')}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="neutral-outline"
                onClick={() => setVoteIntent(null)}
                disabled={voteMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={confirmVote} disabled={voteMutation.isPending}>
                {voteMutation.isPending
                  ? t('common.processing', { defaultValue: 'Processing…' })
                  : t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProposalRow({
  proposal,
  locale,
  onVote,
  votePending,
}: {
  proposal: DaoProposal;
  locale: string;
  onVote: (isFor: boolean) => void;
  votePending: boolean;
}) {
  const { t } = useTranslation();
  const yes = (proposal.votes ?? [])
    .filter((item) => item.isFor)
    .reduce((sum, item) => sum + Number(item.votingPower), 0);
  const no = (proposal.votes ?? [])
    .filter((item) => !item.isFor)
    .reduce((sum, item) => sum + Number(item.votingPower), 0);
  const eligiblePower = (proposal.snapshots ?? []).reduce(
    (sum, item) => sum + Number(item.votingPower),
    0,
  );
  const denominator = eligiblePower > 0 ? eligiblePower : yes + no;
  const yesPercent = denominator > 0 ? Math.min(100, (yes / denominator) * 100) : 0;
  const noPercent = denominator > 0 ? Math.min(100 - yesPercent, (no / denominator) * 100) : 0;

  return (
    <article className="border-border border-b p-4 last:border-b-0 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground text-sm font-semibold">{proposal.title}</h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-xs">{proposal.description}</p>
        </div>
        <span className="bg-muted text-muted-foreground px-2 py-1 text-xs font-medium">
          {proposal.type === 'RENTAL_ENABLEMENT' || proposal.type === 'RENTAL_APPLICATION'
            ? t('assetManagement.governance.rentalProposal', { defaultValue: 'Rental proposal' })
            : proposal.type === 'BUYOUT_PROPOSAL'
              ? t('assetManagement.createProposal.typeBuyout')
              : t(
                  `assetManagement.createProposal.type${proposalCategoryKey(
                    String(proposal.metadata?.governanceCategory ?? 'GENERAL'),
                  )}`,
                  { defaultValue: t('assetManagement.createProposal.typeGeneral') },
                )}
          {' · '}
          {t(`assetManagement.statuses.${proposal.status}`, { defaultValue: proposal.status })}
        </span>
      </div>
      {proposal.endDate ? (
        <p className="text-muted-foreground mt-3 text-xs">
          {t('assetManagement.votingList.endsAt')}:{' '}
          {new Date(proposal.endDate).toLocaleString(locale)}
        </p>
      ) : null}
      {proposal.metadata?.terms && typeof proposal.metadata.terms === 'object' ? (
        <dl className="border-border mt-4 grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
          {Object.entries(proposal.metadata.terms)
            .filter(([key]) =>
              [
                'monthlyRentVnd',
                'depositVnd',
                'maintenanceBudgetVnd',
                'operatorName',
                'operatorContact',
                'salePriceVnd',
                'salePlan',
              ].includes(key),
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt className="text-muted-foreground text-xs">
                  {t(`assetManagement.terms.${key}`)}
                </dt>
                <dd className="mt-1 text-sm font-medium break-words">
                  {key.endsWith('Vnd') ? `${formatBalance(String(value))} VND` : String(value)}
                </dd>
              </div>
            ))}
        </dl>
      ) : null}
      <div className="bg-muted mt-4 flex h-1.5 overflow-hidden">
        <div className="bg-emerald-500" style={{ width: `${yesPercent}%` }} />
        <div className="bg-red-500" style={{ width: `${noPercent}%` }} />
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-xs">
        <span>
          {t('assetManagement.votingList.yes')}: {formatBalance(yes)}
        </span>
        <span>
          {t('assetManagement.votingList.no')}: {formatBalance(no)}
        </span>
        <span>
          {t('assetManagement.votingList.eligiblePower')}: {formatBalance(eligiblePower)}
        </span>
      </div>
      {proposal.status === 'ACTIVE' && proposal.viewerCanVote === true ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="neutral-outline" disabled={votePending} onClick={() => onVote(false)}>
            {t('assetManagement.votingList.voteNo')}
          </Button>
          <Button disabled={votePending} onClick={() => onVote(true)}>
            {t('assetManagement.votingList.voteYes')}
          </Button>
        </div>
      ) : null}
      {proposal.viewerHasVoted ? (
        <p className="mt-3 text-xs text-emerald-600">
          {t('assetManagement.governance.alreadyVoted', {
            defaultValue: 'Your vote has been recorded.',
          })}
        </p>
      ) : null}
      {proposal.type === 'BUYOUT_PROPOSAL' ? (
        <BuyoutEscrowActions proposalId={proposal.id} proposalStatus={proposal.status} />
      ) : null}
    </article>
  );
}

function proposalCategoryKey(category: string) {
  return (
    {
      GENERAL: 'General',
      MAINTENANCE: 'Maintenance',
      OPERATOR_CHANGE: 'OperatorChange',
      RENT_CHANGE: 'RentChange',
      ASSET_SALE: 'AssetSale',
    }[category] ?? 'General'
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Term({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'text-foreground text-right font-semibold'
            : 'text-foreground text-right font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}
