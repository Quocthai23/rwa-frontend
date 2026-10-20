'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { AssetManagementButton as Button } from '@/features/asset-management/web/components/AssetManagementButton';
import { authApi, type AuthChallengePurpose } from '@/services/auth';
import { daoApi, type ProposalStatus } from '@/services/daoService';
import { useAuthStore } from '@/store/authStore';
import { BuyoutPaymentHistory } from './BuyoutPaymentHistory';

type BuyoutAction = 'execute' | 'installment';
type ChallengeFactor = 'TOTP' | 'EMAIL_OTP';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const ESCROW_STATUS: Record<number, string> = {
  0: 'INITIAL',
  1: 'FUNDING',
  2: 'ACTIVE',
  3: 'COMPLETED',
  4: 'DEFAULTED',
  5: 'CANCELLED',
};

export function BuyoutEscrowActions({
  proposalId,
  proposalStatus,
}: {
  proposalId: string;
  proposalStatus: ProposalStatus;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [challengeId, setChallengeId] = useState('');
  const [challengeAction, setChallengeAction] = useState<BuyoutAction | null>(null);
  const [factor, setFactor] = useState<ChallengeFactor>('EMAIL_OTP');
  const [allowedFactors, setAllowedFactors] = useState<ChallengeFactor[]>([]);
  const [code, setCode] = useState('');
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);

  const stateQuery = useQuery({
    queryKey: ['buyout-escrow', proposalId, userId],
    queryFn: () => daoApi.getBuyoutState(proposalId),
    enabled: Boolean(userId) && (proposalStatus === 'PASSED' || proposalStatus === 'EXECUTED'),
    refetchInterval: proposalStatus === 'EXECUTED' ? 30_000 : false,
    retry: false,
  });
  const state = stateQuery.data;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['buyout-escrow', proposalId] }),
      queryClient.invalidateQueries({ queryKey: ['proposals'] }),
      queryClient.invalidateQueries({ queryKey: ['asset-buyout-proposals'] }),
      ...[
        'asset-proposals',
        'asset-action-counts',
        'accounts',
        'assets',
        'asset-status',
        'portfolio',
        'account-summary',
        'account-balance',
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!challengeAction || !challengeId || code.trim().length !== 6) {
        throw new Error(
          t('assetManagement.buyout.mfaCodeRequired', {
            defaultValue: 'Enter the 6-digit verification code.',
          }),
        );
      }
      await authApi.verifyAuthChallenge({
        challengeId,
        factor,
        code: code.trim(),
      });
      return challengeAction === 'execute'
        ? daoApi.executeBuyout(proposalId, challengeId)
        : daoApi.payBuyoutInstallment(proposalId, challengeId);
    },
    onSuccess: async () => {
      toast.success(
        challengeAction === 'execute'
          ? t('assetManagement.buyout.activationSuccess', {
              defaultValue: 'The buyout program is active.',
            })
          : t('assetManagement.buyout.paymentSuccess', {
              defaultValue: 'The next period has been paid.',
            }),
      );
      setChallengeAction(null);
      setChallengeId('');
      setCode('');
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(
        errorMessage(
          error,
          t('assetManagement.buyout.actionError', {
            defaultValue: 'Unable to confirm the buyout transaction.',
          }),
        ),
      );
    },
  });

  const claimMutation = useMutation({
    mutationFn: () => daoApi.claimBuyoutProceeds(proposalId),
    onSuccess: async () => {
      toast.success(
        t('assetManagement.buyout.claimSuccess', {
          defaultValue: 'VND proceeds were credited to your custodial cash balance.',
        }),
      );
      await refresh();
    },
    onError: (error: unknown) => {
      toast.error(
        errorMessage(
          error,
          t('assetManagement.buyout.claimError', {
            defaultValue: 'Unable to claim buyout proceeds.',
          }),
        ),
      );
    },
  });

  const startChallenge = async (action: BuyoutAction) => {
    if (isStartingChallenge) return;
    setIsStartingChallenge(true);
    try {
      const purpose: AuthChallengePurpose =
        action === 'execute' ? 'BUYOUT_ESCROW' : 'BUYOUT_INSTALLMENT';
      const payload: Record<string, string> = { proposalId };
      if (action === 'installment') {
        payload.installmentNumber = String(
          (state?.mode === 'DYNAMIC_VND'
            ? (state.schedule?.monthsCompleted ?? 0)
            : (state?.escrow?.installmentsPaid ?? 0)) + 1,
        );
      }
      const challenge = await authApi.createAuthChallenge({ purpose, payload });
      const factors = challenge.requiredFactors.filter(
        (item): item is ChallengeFactor => item === 'TOTP' || item === 'EMAIL_OTP',
      );
      setAllowedFactors(factors);
      setFactor(factors.includes('EMAIL_OTP') ? 'EMAIL_OTP' : 'TOTP');
      setChallengeId(challenge.challengeId);
      setChallengeAction(action);
      setCode('');
      if (factors.includes('EMAIL_OTP')) {
        toast.success(
          t('assetManagement.buyout.otpSent', {
            defaultValue: 'A verification code was sent to your account email.',
          }),
        );
      }
    } catch (error: unknown) {
      toast.error(
        errorMessage(
          error,
          t('assetManagement.buyout.challengeError', {
            defaultValue: 'Unable to start verification.',
          }),
        ),
      );
    } finally {
      setIsStartingChallenge(false);
    }
  };

  if (proposalStatus !== 'PASSED' && proposalStatus !== 'EXECUTED') return null;
  if (stateQuery.isLoading) {
    return (
      <p className="text-muted-foreground text-xs">
        {t('assetManagement.buyout.loadingState', { defaultValue: 'Loading buyout status...' })}
      </p>
    );
  }
  if (stateQuery.isError || !state) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        {t('assetManagement.buyout.stateUnavailable', {
          defaultValue: 'The buyout state is not available in this environment.',
        })}
      </p>
    );
  }

  const dynamic = state.mode === 'DYNAMIC_VND';
  const schedule = state.schedule;
  const escrow = state.escrow;
  const installmentsPaid = dynamic
    ? (schedule?.monthsCompleted ?? 0)
    : (escrow?.installmentsPaid ?? 0);
  const totalInstallments = dynamic
    ? (schedule?.totalMonths ?? 0)
    : (escrow?.totalInstallments ?? 0);
  const isActive = dynamic ? schedule?.status === 'ACTIVE' : escrow?.status === 2;
  const hasClaim = dynamic
    ? Number(schedule?.claimableAmount ?? '0') > 0
    : Number(state.seller?.claimablePayment ?? '0') > 0 ||
      ((escrow?.status === 4 || escrow?.status === 5) &&
        Number(state.seller?.lockedTokens ?? '0') > 0 &&
        state.seller?.tokensRefunded !== true);
  const formatVnd = (value?: string) =>
    new Intl.NumberFormat(i18n.language || 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
  const statusLabel = dynamic
    ? schedule?.status
      ? t(`assetManagement.statuses.${schedule.status}`, { defaultValue: schedule.status })
      : t('assetManagement.buyout.awaitingActivation', { defaultValue: 'Awaiting activation' })
    : t(`assetManagement.statuses.${ESCROW_STATUS[escrow?.status ?? 0] ?? 'INITIAL'}`);
  const paidVnd = Number(schedule?.principalPaidVnd ?? 0) + Number(schedule?.premiumPaidVnd ?? 0);

  return (
    <>
      <div className="border-border/60 bg-muted/20 mt-4 space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {t('assetManagement.buyout.paymentTitle', { defaultValue: 'Buyout payments' })}
          </span>
          <span className="font-semibold">{statusLabel}</span>
        </div>
        {(dynamic ? Boolean(schedule) : escrow?.status !== 0) && (
          <>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (installmentsPaid / Math.max(1, totalInstallments)) * 100,
                  )}%`,
                }}
              />
            </div>
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>
                {t('assetManagement.buyout.periodProgress', {
                  defaultValue: 'Period {{paid}}/{{total}}',
                  paid: installmentsPaid,
                  total: totalInstallments,
                })}
              </span>
              <span>
                {dynamic
                  ? `${formatVnd(String(paidVnd))} / ${formatVnd(schedule?.totalConsiderationVnd)}`
                  : `${escrow?.paidConsideration ?? '0'}/${escrow?.totalConsideration ?? '0'} VND`}
              </span>
            </div>
          </>
        )}

        {!state.isBuyer && hasClaim && (
          <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground text-xs">
                {t('assetManagement.buyout.availableProceeds', {
                  defaultValue: 'Available to claim',
                })}
              </p>
              <p className="text-foreground mt-1 text-xl font-semibold tabular-nums">
                {formatVnd(dynamic ? schedule?.claimableAmount : state.seller?.claimablePayment)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('assetManagement.buyout.claimExplanation', {
                  defaultValue:
                    'Payments already funded by the acquirer. Claim to credit your available balance.',
                })}
              </p>
            </div>
            <Button
              variant="primary-contained"
              onClick={() => claimMutation.mutate()}
              disabled={!hasClaim || claimMutation.isPending}
            >
              {claimMutation.isPending ? t('common.processing') : t('assetManagement.buyout.claim')}
            </Button>
          </div>
        )}
        {!state.isBuyer && dynamic && <BuyoutPaymentHistory periods={schedule?.installments} />}
        <div className="flex flex-wrap gap-2">
          {state.isBuyer &&
            proposalStatus === 'PASSED' &&
            (dynamic ? !schedule : (escrow?.status ?? 0) <= 1) && (
              <Button
                onClick={() => startChallenge('execute')}
                disabled={isStartingChallenge}
                className="rounded-lg"
              >
                {isStartingChallenge
                  ? t('assetManagement.buyout.preparingMfa', {
                      defaultValue: 'Preparing verification...',
                    })
                  : t('assetManagement.buyout.activate', { defaultValue: 'Verify and activate' })}
              </Button>
            )}
          {state.isBuyer && proposalStatus === 'EXECUTED' && isActive && (
            <Button
              onClick={() => startChallenge('installment')}
              disabled={isStartingChallenge}
              className="rounded-lg"
            >
              {t('assetManagement.buyout.payPeriod', {
                defaultValue: 'Pay period {{count}}',
                count: installmentsPaid + 1,
              })}
            </Button>
          )}
          {state.isBuyer && hasClaim && (
            <Button
              variant="neutral-outline"
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="rounded-lg"
            >
              {claimMutation.isPending
                ? t('common.processing', { defaultValue: 'Processing...' })
                : t('assetManagement.buyout.claim', { defaultValue: 'Claim VND proceeds' })}
            </Button>
          )}
        </div>
      </div>

      {challengeAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
            <h3 className="text-foreground text-lg font-bold">
              {t('assetManagement.buyout.confirmTitle', {
                defaultValue: 'Confirm buyout transaction',
              })}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('assetManagement.buyout.confirmDescription', {
                defaultValue: 'This action is authorized only after a valid MFA challenge.',
              })}
            </p>

            {allowedFactors.length > 1 && (
              <div className="mt-4 flex gap-2">
                {allowedFactors.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFactor(item)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      factor === item
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {item === 'EMAIL_OTP' ? 'Email OTP' : 'Authenticator'}
                  </button>
                ))}
              </div>
            )}

            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('assetManagement.buyout.mfaPlaceholder', {
                defaultValue: 'Enter 6-digit code',
              })}
              className="bg-background border-border text-foreground focus:border-primary mt-4 w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.35em] outline-none"
            />

            <div className="mt-5 flex gap-3">
              <Button
                variant="neutral-outline"
                className="flex-1 rounded-xl"
                disabled={actionMutation.isPending}
                onClick={() => {
                  setChallengeAction(null);
                  setChallengeId('');
                  setCode('');
                }}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={code.length !== 6 || actionMutation.isPending}
                onClick={() => actionMutation.mutate()}
              >
                {actionMutation.isPending
                  ? t('assetManagement.buyout.confirming', { defaultValue: 'Confirming...' })
                  : t('common.confirm', { defaultValue: 'Confirm' })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
