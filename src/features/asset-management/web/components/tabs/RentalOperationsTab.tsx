'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { Textarea } from '@/components/shared/atoms/textarea';
import {
  useAssetStatus,
  useRentalApplications,
  useReviewRentalApplication,
} from '@/hook/useAssetManagement';
import type { Asset } from '@/types/assets';
import { truncateAddress } from '@/utils/truncateAddress';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAuthStore } from '@/store/authStore';
import { usePayRentalIncome, useRentalIncomeDistributions } from '@/hook/useDividends';
import { getGuestNumber } from '@/utils/publicIdentity';

export default function RentalOperationsTab({ asset }: { asset: Asset }) {
  const { t } = useTranslation();
  const { data: status, isLoading } = useAssetStatus(asset.id);
  const currentUser = useAuthStore((state) => state.user);
  const isOperator = currentUser?.id === asset.issuerId || currentUser?.role === 'ADMIN';
  const applicationsQuery = useRentalApplications(asset.id, isOperator);
  const reviewApplication = useReviewRentalApplication(asset.id);
  const payRentalIncome = usePayRentalIncome(asset.id);
  const incomeHistory = useRentalIncomeDistributions(asset.id, Boolean(currentUser));
  const [reviewing, setReviewing] = useState<{
    applicationId: string;
    decision: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [monthlyRentVnd, setMonthlyRentVnd] = useState('');
  const [depositVnd, setDepositVnd] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [durationMonths, setDurationMonths] = useState('12');
  const [rejectionReason, setRejectionReason] = useState('');

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const rental = status?.rentalContract;
  const hasActiveRental = rental?.status === 'ACTIVE';
  const tenant = rental?.tenant;
  const tenantName = tenant?.id
    ? t('assetManagement.rentalOperations.guestName', {
        number: getGuestNumber(tenant),
        defaultValue: 'Guest {{number}}',
      })
    : null;
  const isCurrentTenant = Boolean(currentUser?.id && tenant?.id === currentUser.id);
  const closeReview = () => {
    setReviewing(null);
    setMonthlyRentVnd('');
    setDepositVnd('');
    setDueDay('5');
    setDurationMonths('12');
    setRejectionReason('');
  };

  const submitReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewing) return;

    const payload =
      reviewing.decision === 'APPROVE'
        ? {
            decision: 'APPROVE' as const,
            monthlyRentVnd,
            depositVnd,
            dueDay: Number(dueDay),
            contractDurationMonths: Number(durationMonths),
          }
        : {
            decision: 'REJECT' as const,
            rejectionReason: rejectionReason.trim(),
          };

    reviewApplication.mutate(
      { applicationId: reviewing.applicationId, payload },
      {
        onSuccess: () => {
          toast.success(
            t(
              reviewing.decision === 'APPROVE'
                ? 'assetManagement.rentalOperations.approveSuccess'
                : 'assetManagement.rentalOperations.rejectSuccess',
            ),
          );
          closeReview();
        },
        onError: (error) =>
          toast.error(localizeApiError(error, t, 'assetManagement.rentalOperations.reviewError')),
      },
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-foreground text-base font-semibold">
          {t('assetManagement.rentalOperations.title', { defaultValue: 'Hoạt động cho thuê' })}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('assetManagement.rentalOperations.tenantDescription')}
        </p>
      </header>

      <section className="border-border border">
        <Row
          label={t('assetManagement.rentalOperations.status', {
            defaultValue: 'Trạng thái khai thác',
          })}
          value={
            rental?.status === 'ACTIVE'
              ? t('assetManagement.operations.rented')
              : t('assetManagement.rentalOperations.availableForApplications')
          }
        />
        <Row
          label={t('assetManagement.rentalOperations.tenant', {
            defaultValue: 'Người thuê hiện tại',
          })}
          value={tenantName || t('assetManagement.rentalOperations.noTenant')}
        />
        <Row
          label={t('assetManagement.rentalOperations.wallet', { defaultValue: 'Ví người thuê' })}
          value={tenant?.walletAddress ? truncateAddress(tenant.walletAddress) : '—'}
        />
        <Row
          label={t('assetManagement.rentalOperations.startDate', {
            defaultValue: 'Ngày bắt đầu hợp đồng',
          })}
          value={rental?.startDate ? new Date(rental.startDate).toLocaleDateString('vi-VN') : '—'}
        />
        <Row
          label={t('assetManagement.rentalOperations.monthlyRentVnd')}
          value={
            rental?.monthlyRentVnd ? `${Number(rental.monthlyRentVnd).toLocaleString()} VND` : '—'
          }
        />
        <Row
          label={t('assetManagement.rentalOperations.depositVnd')}
          value={rental?.depositVnd ? `${Number(rental.depositVnd).toLocaleString()} VND` : '—'}
        />
        <Row
          label={t('assetManagement.rentalOperations.endDate')}
          value={rental?.endDate ? new Date(rental.endDate).toLocaleDateString('vi-VN') : '—'}
        />
        <Row
          label={t('assetManagement.rentalOperations.nextCollection', {
            defaultValue: 'Kỳ thu tiền tiếp theo',
          })}
          value={rental ? `Còn ${status?.nextDeductionDays ?? 0} ngày` : '—'}
        />
        <Row
          label={t('assetManagement.expectedApy', { defaultValue: 'Lợi suất dự kiến theo năm' })}
          value={`${Number(asset.expectedApy || 0).toFixed(2)}%`}
        />
      </section>

      {hasActiveRental && isCurrentTenant && (
        <section className="border-border flex flex-wrap items-center justify-between gap-4 border p-4">
          <div>
            <h3 className="text-foreground text-sm font-semibold">
              {t('assetManagement.rentalOperations.monthlyPaymentTitle', {
                defaultValue: 'Thanh toán tiền thuê tháng này',
              })}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('assetManagement.rentalOperations.monthlyPaymentDescription', {
                defaultValue:
                  'Tiền được khóa trong ký quỹ và chỉ chuyển cho các chủ token khi họ bấm Nhận.',
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="primary-contained"
            disabled={payRentalIncome.isPending}
            onClick={() =>
              payRentalIncome.mutate(undefined, {
                onSuccess: () =>
                  toast.success(
                    t('assetManagement.rentalOperations.monthlyPaymentSuccess', {
                      defaultValue: 'Đã nộp tiền thuê và tạo kỳ chia thu nhập.',
                    }),
                  ),
                onError: (error) =>
                  toast.error(
                    localizeApiError(
                      error,
                      t,
                      'assetManagement.rentalOperations.monthlyPaymentError',
                    ),
                  ),
              })
            }
          >
            {payRentalIncome.isPending
              ? t('assetManagement.rentalOperations.monthlyPaymentProcessing', {
                  defaultValue: 'Đang thanh toán...',
                })
              : t('assetManagement.rentalOperations.monthlyPaymentAction', {
                  amount: Number(rental?.monthlyRentVnd ?? 0).toLocaleString('vi-VN'),
                  defaultValue: 'Thanh toán {{amount}} VND',
                })}
          </Button>
        </section>
      )}

      {currentUser && (
        <section className="border-border border">
          <div className="border-border border-b p-4">
            <h3 className="text-foreground text-sm font-semibold">
              {t('assetManagement.rentalOperations.incomeHistoryTitle')}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('assetManagement.rentalOperations.incomeHistoryDescription')}
            </p>
          </div>
          {incomeHistory.data?.length ? (
            <div className="divide-border divide-y">
              {incomeHistory.data.map((distribution) => {
                const myClaim = distribution.claims[0];
                return (
                  <div
                    key={distribution.id}
                    className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_1fr_1fr]"
                  >
                    <span className="text-foreground">
                      {new Date(distribution.periodStart).toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-muted-foreground sm:text-right">
                      {Number(distribution.totalAmount).toLocaleString('vi-VN')} VND
                    </span>
                    <span className="text-muted-foreground sm:text-right">
                      {myClaim
                        ? `${Number(myClaim.amount).toLocaleString('vi-VN')} VND · ${t(
                            myClaim.status === 'CLAIMED'
                              ? 'assetManagement.rentalOperations.incomeClaimed'
                              : 'assetManagement.rentalOperations.incomeClaimable',
                          )}`
                        : t('assetManagement.rentalOperations.noIncomeForAccount')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground p-4 text-sm">
              {incomeHistory.isLoading
                ? t('common.loading', { defaultValue: 'Đang tải…' })
                : t('assetManagement.rentalOperations.noIncomeHistory')}
            </p>
          )}
        </section>
      )}

      {isOperator ? (
        <section className="border-border border">
          <div className="border-border border-b px-4 py-3">
            <h3 className="text-foreground text-sm font-semibold">
              {t('assetManagement.rentalOperations.applicantList')}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('assetManagement.rentalOperations.applicantListDescription')}
            </p>
          </div>
          {applicationsQuery.isLoading ? (
            <Skeleton className="m-4 h-24 w-auto" />
          ) : !applicationsQuery.data?.length ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              {t('assetManagement.rentalOperations.noApplications')}
            </p>
          ) : (
            <div className="divide-border divide-y">
              {applicationsQuery.data.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <Link
                      href={`/discover?tab=profile?userId=${encodeURIComponent(item.applicant?.id ?? '')}`}
                      className="text-foreground text-sm font-semibold hover:underline"
                    >
                      {item.applicant?.id
                        ? t('assetManagement.rentalOperations.guestName', {
                            number: getGuestNumber(item.applicant),
                            defaultValue: 'Guest {{number}}',
                          })
                        : t('assetManagement.rentalOperations.unknownApplicant')}
                    </Link>
                    {item.message ? (
                      <p className="text-muted-foreground mt-1 text-xs">{item.message}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-2 text-xs">
                      {item.desiredStartDate
                        ? t('assetManagement.rentalOperations.preferredDateValue', {
                            date: new Date(item.desiredStartDate).toLocaleDateString(),
                          })
                        : t('assetManagement.rentalOperations.noPreferredDate')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t(`assetManagement.rentalOperations.applicationStatuses.${item.status}`, {
                        defaultValue: item.status,
                      })}
                    </span>
                    {item.status === 'PENDING' ? (
                      <>
                        <Button
                          type="button"
                          variant="green-outline"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            setReviewing({ applicationId: item.id, decision: 'APPROVE' })
                          }
                        >
                          {t('assetManagement.rentalOperations.approve')}
                        </Button>
                        <Button
                          type="button"
                          variant="red-outline"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            setReviewing({ applicationId: item.id, decision: 'REJECT' })
                          }
                        >
                          {t('assetManagement.rentalOperations.reject')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {reviewing?.applicationId === item.id ? (
                    <form
                      onSubmit={submitReview}
                      className="border-border bg-muted/20 space-y-3 border p-3 sm:col-span-2"
                    >
                      {reviewing.decision === 'APPROVE' ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ReviewInput
                            label={t('assetManagement.rentalOperations.monthlyRentVnd')}
                            value={monthlyRentVnd}
                            onChange={setMonthlyRentVnd}
                            min="1"
                          />
                          <ReviewInput
                            label={t('assetManagement.rentalOperations.depositVnd')}
                            value={depositVnd}
                            onChange={setDepositVnd}
                            min="0"
                          />
                          <ReviewInput
                            label={t('assetManagement.rentalOperations.dueDay')}
                            value={dueDay}
                            onChange={setDueDay}
                            min="1"
                            max="28"
                          />
                          <ReviewInput
                            label={t('assetManagement.rentalOperations.durationMonths')}
                            value={durationMonths}
                            onChange={setDurationMonths}
                            min="1"
                            max="120"
                          />
                        </div>
                      ) : (
                        <Textarea
                          required
                          maxLength={1000}
                          rows={3}
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder={t('assetManagement.rentalOperations.rejectionReason')}
                          className="text-sm"
                        />
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="neutral-outline"
                          className="h-9 px-4 text-xs"
                          onClick={closeReview}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          type="submit"
                          variant={
                            reviewing.decision === 'APPROVE' ? 'green-contained' : 'red-contained'
                          }
                          className="h-9 px-4 text-xs"
                          disabled={reviewApplication.isPending}
                        >
                          {reviewApplication.isPending
                            ? t('assetManagement.rentalOperations.reviewing')
                            : t('assetManagement.rentalOperations.confirmDecision')}
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ReviewInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max?: string;
}) {
  return (
    <label className="text-muted-foreground text-xs">
      <span className="mb-1 block">{label}</span>
      <Input
        required
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-sm"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b px-4 py-3 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-right text-sm font-medium">{value}</span>
    </div>
  );
}
