import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/shared/atoms/app/sheet';
import AssetDepositFlowSheet from './AssetDepositFlowSheet';
import AssetWithdrawFlowSheet from './AssetWithdrawFlowSheet';
import ContractTemplateSheet from './ContractTemplateSheet';
import { MiniOrderbook } from './MiniOrderbook';
import {
  useAssetStatus,
  useEligibility,
  useBuyoutProposals,
  useVoteProposal,
  useCreateProposal,
} from '@/hook/useAssetManagement';
import { formatBalance } from '@/utils/currency';
import { truncateAddress } from '@/utils/truncateAddress';
import { toast } from 'sonner';
import { useAccountStore } from '@/store/useAccountStore';
import { BuyoutEscrowActions } from '../BuyoutEscrowActions';

const BUYOUT_BANDS = [
  { months: 6, min: 3, max: 5 }, { months: 12, min: 5, max: 8 },
  { months: 18, min: 7, max: 11 }, { months: 24, min: 9, max: 14 },
  { months: 36, min: 13, max: 20 }, { months: 48, min: 17, max: 26 },
] as const;

export default function GeneralTab({ asset }: { asset: any }) {
  const { t } = useTranslation();

  // Queries
  const { data: statusData, isLoading: isLoadingStatus } = useAssetStatus(asset?.id);
  const { data: eligibility, isLoading: isLoadingEligibility } = useEligibility(asset?.id);
  const { data: proposals, isLoading: isLoadingProposals } = useBuyoutProposals(asset?.id);
  const { mutate: voteProposal, isPending: isVoting } = useVoteProposal();
  const { mutate: createProposal, isPending: isCreating } = useCreateProposal(asset?.id);

  // Local state for proposal creation and transfers
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const userAddress = selectedAccount?.id || '';

  const [title, setTitle] = useState('');
  const [type] = useState('BUYOUT_PROPOSAL');
  const [description, setDescription] = useState('');
  const [totalMonths, setTotalMonths] = useState('12');
  const [premiumPercent, setPremiumPercent] = useState(6.5);

  // Voting state
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  const durationOptions = BUYOUT_BANDS.map((item) => item.months);
  const premiumBand = BUYOUT_BANDS.find((item) => item.months === Number(totalMonths)) ?? BUYOUT_BANDS[1];

  if (isLoadingStatus || isLoadingEligibility || isLoadingProposals) {
    return (
      <div className="w-full max-w-6xl">
        <Skeleton className="bg-muted/50 mb-6 h-8 w-64 rounded-lg" />
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="bg-muted/50 h-48 w-full rounded-2xl" />
          <Skeleton className="bg-muted/50 h-48 w-full rounded-2xl" />
        </div>
        <Skeleton className="bg-muted/50 mb-8 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // General Status Info
  const renterAddress = statusData?.rentalContract?.tenant?.walletAddress;
  const startDateStr = statusData?.rentalContract?.startDate;
  const contractBalance = statusData?.contractBalanceVNDT || 0;
  const nextDeduction = statusData?.nextDeductionDays || 0;

  const getMonthsAgo = (dateStr: string) => {
    const start = new Date(dateStr);
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return months === 0 ? 'less than a month' : `${months} months`;
  };
  const joinedAgo = startDateStr ? getMonthsAgo(startDateStr) : 'N/A';

  // Eligibility Info
  const isEligible = eligibility?.eligible || false;
  const reason = eligibility?.reason || '';

  // Active Proposals
  const activeProposals = proposals || [];

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error(t('assetManagement.createProposal.errorMsg', 'Please fill all required fields'));
      return;
    }

    toast.loading(
      t('assetManagement.createProposal.submitting', 'Recording proposal and voting snapshot...'),
      { id: 'signing' },
    );

    createProposal(
      { title, description, durationMonths: parseInt(totalMonths), premiumPercent },
      {
        onSuccess: () => {
          toast.success(
            t('assetManagement.createProposal.successMsg', 'Proposal created successfully!'),
            { id: 'signing' },
          );
          setTitle('');
          setDescription('');
        },
        onError: () => {
          toast.error(t('assetManagement.createProposal.errorMsg', 'Failed to record proposal'), {
            id: 'signing',
          });
        },
      },
    );
  };

  const handleLoadTemplate = () => {
    setIsTemplateSheetOpen(true);
  };

  const handleApplyTemplate = (appliedTitle: string, appliedDescription: string) => {
    setTitle(appliedTitle);
    setDescription(appliedDescription);
  };

  const handleVote = (isFor: boolean) => {
    if (!selectedProposal) return;
    voteProposal(
      { proposalId: selectedProposal.id, payload: { isFor } },
      {
        onSuccess: () => {
          toast.success(t('assetManagement.votingList.voteSuccess', 'Vote cast successfully!'));
          setSelectedProposal(null);
        },
        onError: (err: any) => {
          toast.error(
            err?.message || t('assetManagement.votingList.voteError', 'Failed to cast vote'),
          );
        },
      },
    );
  };

  return (
    <div className="w-full space-y-8 pb-16">
      <section className="border-border/70 bg-card relative overflow-hidden rounded-3xl border shadow-sm">
        <div className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b to-transparent" />
        <div className="relative grid gap-7 p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] uppercase">
                {t('assetManagement.commandCenter.badge', 'Trung tâm điều hành')}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-emerald-700 uppercase dark:text-emerald-300">
                {t('assetManagement.commandCenter.onchain', 'Dữ liệu xác thực on-chain')}
              </span>
            </div>
            <h2 className="text-foreground max-w-2xl text-2xl font-bold tracking-tight lg:text-3xl">
              {t('assetManagement.commandCenter.title', 'Toàn bộ tài sản trong một bảng điều hành')}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
              {t(
                'assetManagement.commandCenter.description',
                'Theo dõi vận hành, thu nhập cho thuê, thanh khoản token và mọi quyết định của cộng đồng theo thời gian thực.',
              )}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="border-border/70 bg-background/80 rounded-2xl border p-4">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('assetManagement.commandCenter.operation', 'Vận hành')}
                </p>
                <p className="text-foreground mt-2 text-sm font-bold">
                  {renterAddress
                    ? t('assetManagement.commandCenter.rented', 'Đang cho thuê')
                    : t('assetManagement.commandCenter.available', 'Sẵn sàng khai thác')}
                </p>
              </div>
              <div className="border-border/70 bg-background/80 rounded-2xl border p-4">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('assetManagement.commandCenter.yield', 'Lợi suất dự kiến')}
                </p>
                <p className="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(asset?.expectedApy || 0).toLocaleString('vi-VN', {
                    maximumFractionDigits: 2,
                  })}
                  %/năm
                </p>
              </div>
              <div className="border-border/70 bg-background/80 rounded-2xl border p-4">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('assetManagement.commandCenter.openVotes', 'Biểu quyết mở')}
                </p>
                <p className="text-foreground mt-2 text-sm font-bold">
                  {activeProposals.filter((proposal: any) => proposal.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="border-border/70 bg-background/80 rounded-2xl border p-4">
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('assetManagement.commandCenter.buyout', 'Quyền thâu tóm')}
                </p>
                <p
                  className={
                    isEligible
                      ? 'mt-2 text-sm font-bold text-emerald-600'
                      : 'mt-2 text-sm font-bold text-amber-600'
                  }
                >
                  {isEligible
                    ? t('assetManagement.commandCenter.eligible', 'Đã đủ điều kiện')
                    : t('assetManagement.commandCenter.locked', 'Chưa đủ điều kiện')}
                </p>
              </div>
            </div>
          </div>
          <aside className="border-border/70 bg-background/85 rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  {t('assetManagement.commandCenter.health', 'Sức khỏe tài sản')}
                </p>
                <p className="text-foreground mt-1 text-lg font-bold">
                  {t('assetManagement.commandCenter.stable', 'Ổn định')}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-lg font-bold text-emerald-600">
                A
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {[
                [t('assetManagement.commandCenter.tokenized', 'Token hóa và định danh'), '100%'],
                [
                  t('assetManagement.commandCenter.cashflow', 'Theo dõi dòng tiền thuê'),
                  renterAddress ? '100%' : '0%',
                ],
                [t('assetManagement.commandCenter.governance', 'Quản trị cộng đồng'), '100%'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-semibold">{value}</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div className="bg-primary h-full rounded-full" style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border/70 mt-5 border-t pt-4">
              <p className="text-muted-foreground text-xs leading-5">
                {isEligible
                  ? t(
                      'assetManagement.commandCenter.buyoutReadyHint',
                      'Bạn có thể khởi tạo đề xuất thâu tóm để cộng đồng xem xét.',
                    )
                  : t(
                      'assetManagement.commandCenter.buyoutLockedHint',
                      'Hệ thống sẽ tự mở quyền thâu tóm khi đủ tỷ lệ sở hữu và thời gian nắm giữ.',
                    )}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* 1. General Info */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-h3-bold text-foreground tracking-tight">
            {t('assetManagement.tabs.general', 'General Management')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Current Renters Card */}
          <div className="bg-background border-border/50 group relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm">
            <div className="from-primary/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <h3 className="text-muted-foreground mb-6 flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {t('assetManagement.general.currentRenters', 'Current Renters')}
              </h3>
              <div className="flex items-center gap-4">
                <div className="bg-muted border-border text-body-large-bold text-foreground flex h-12 w-12 items-center justify-center rounded-full border">
                  {renterAddress ? renterAddress.slice(2, 4).toUpperCase() : '--'}
                </div>
                <div>
                  <p className="text-body-large-bold text-foreground font-mono">
                    {renterAddress
                      ? truncateAddress(renterAddress)
                      : t('assetManagement.general.noActiveRenter', 'No active renter')}
                  </p>
                  {renterAddress && (
                    <p className="text-body-small-regular text-muted-foreground mt-0.5">
                      {t('assetManagement.general.joinedAgo', 'Joined {{time}} ago', {
                        time: joinedAgo,
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-border/50 mt-8 flex items-center justify-between border-t pt-5">
                <span className="text-body-small-medium text-muted-foreground">
                  {t('assetManagement.general.expectedApy', 'Expected APY')}
                </span>
                <span className="text-body-small-bold inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 py-1 text-green-600 dark:text-green-400">
                  {asset?.expectedApy || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Contract Balance Card */}
          <div className="bg-background border-border/50 group relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col">
              <h3 className="text-muted-foreground mb-6 flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                {t('assetManagement.general.contractBalance', 'Contract Balance')}
              </h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <p className="text-foreground text-[32px] leading-none font-bold tracking-tight">
                    {formatBalance(contractBalance)}
                  </p>
                  <p className="text-body-large-bold text-muted-foreground">VNĐ </p>
                </div>
                <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[12px] font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('assetManagement.general.nextDeduction', 'Next deduction in {{days}} days', {
                    days: nextDeduction,
                  })}
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  onClick={() => setIsDepositSheetOpen(true)}
                  className="text-body-medium-bold h-auto flex-1 rounded-xl py-2.5 shadow-sm"
                >
                  {t('common.deposit', 'Deposit')}
                </Button>
                <Button
                  variant="neutral-outline"
                  onClick={() => setIsWithdrawSheetOpen(true)}
                  className="text-body-medium-bold bg-background text-foreground border-border/50 hover:bg-muted h-auto flex-1 rounded-xl py-2.5 shadow-sm"
                >
                  {t('common.withdraw', 'Withdraw')}
                </Button>
              </div>
            </div>
          </div>

          {/* Mini Orderbook */}
          <MiniOrderbook assetId={asset?.id || ''} symbol={asset?.symbol || ''} />
        </div>
      </section>

      {/* 2. Buyout Config & Create Proposal */}
      <section>
        <h2 className="text-h3-bold text-foreground mb-6 tracking-tight">
          {t('assetManagement.buyoutConfig.title', 'Ownership & Buyout Config')}
        </h2>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Eligibility Status */}
          <div className="bg-background border-border/50 h-fit rounded-2xl border p-6 shadow-sm xl:col-span-1">
            <div className="flex flex-col gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ${isEligible ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}
              >
                {isEligible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-body-large-bold text-foreground">
                  {isEligible
                    ? t('assetManagement.buyoutConfig.eligible', 'Eligible for Buyout')
                    : t('assetManagement.buyoutConfig.notEligible', 'Not Eligible for Buyout')}
                </h3>
                <p className="text-body-small-regular text-muted-foreground mt-2 leading-relaxed">
                  {isEligible
                    ? t(
                        'assetManagement.buyoutConfig.eligibleDesc',
                        'Congratulations! You meet all requirements to initiate a DAO buyout proposal.',
                      )
                    : reason ||
                      t(
                        'assetManagement.buyoutConfig.notEligibleDesc',
                        'You must currently own the configured controlling stake and have continuously held the minimum token amount for the required period.',
                      )}
                </p>
              </div>
              <div className="border-border/50 mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-[12px] font-bold tracking-wider uppercase">
                  <span className="text-muted-foreground">
                    {t('assetManagement.buyoutConfig.holdingRequirement', 'Holding Requirement')}
                  </span>
                  <span className="text-foreground">
                    {t('assetManagement.buyoutConfig.target', 'Current control + 6m history')}
                  </span>
                </div>
                <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full shadow-inner">
                  <div
                    className={`h-full transition-all duration-1000 ${isEligible ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: isEligible ? '100%' : '15%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Create Proposal Form */}
          <div
            className={`bg-background border-border/50 rounded-2xl border p-6 shadow-sm xl:col-span-2`}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-body-large-bold text-foreground">
                {t('assetManagement.createProposal.title', 'Create Proposal')}
              </h3>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="neutral-outline"
                  onClick={handleLoadTemplate}
                  className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20 h-auto rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  {t('assetManagement.createProposal.loadTemplate', 'Load Template')}
                </Button>

                {type === 'BUYOUT_PROPOSAL' && !isEligible && (
                  <span className="rounded-md bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-yellow-600 uppercase">
                    Buyout Locked
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <label className="text-foreground text-[12px] font-bold tracking-wider uppercase">
                    {t('assetManagement.createProposal.proposalTitle')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Asset Buyout"
                    className="bg-muted/30 border-border/50 h-11"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-foreground text-[12px] font-bold tracking-wider uppercase">
                    {t('assetManagement.createProposal.proposalType')}
                  </label>
                  <select
                    value={type}
                    disabled
                    className="bg-muted/30 border-border/50 text-body-small-regular text-foreground focus:ring-primary h-11 w-full rounded-md border px-3 transition-shadow outline-none focus:ring-1"
                  >
                    <option value="BUYOUT_PROPOSAL">
                      {t('assetManagement.createProposal.typeBuyout', 'Buyout Proposal')}
                    </option>
                  </select>
                </div>
              </div>

              {type === 'BUYOUT_PROPOSAL' && (
                <div className="bg-muted/10 border-border/50 grid grid-cols-2 gap-5 rounded-xl border p-5">
                  <div className="space-y-2.5">
                    <label className="text-foreground text-[12px] font-bold tracking-wider uppercase">
                      {t('assetManagement.createProposal.durationMonths', 'Duration (Months)')}
                    </label>
                    <select
                      value={totalMonths}
                      onChange={(e) => {
                        const nextMonths = Number(e.target.value);
                        const nextBand = BUYOUT_BANDS.find((item) => item.months === nextMonths) ?? BUYOUT_BANDS[1];
                        setTotalMonths(e.target.value);
                        setPremiumPercent((nextBand.min + nextBand.max) / 2);
                      }}
                      className="bg-background border-border/50 text-body-small-regular focus:ring-primary h-10 w-full rounded-md border px-3 transition-shadow outline-none focus:ring-1"
                    >
                      {durationOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-foreground text-[12px] font-bold tracking-wider uppercase">
                      {t('assetManagement.createProposal.premiumPercent', 'System Premium')}
                    </label>
                    <input type="range" min={premiumBand.min} max={premiumBand.max} step="0.1" value={premiumPercent} onChange={(e) => setPremiumPercent(Number(e.target.value))} className="accent-primary w-full" />
                    <div className="text-muted-foreground flex justify-between text-xs"><span>{premiumBand.min}%</span><strong className="text-foreground">{premiumPercent}%</strong><span>{premiumBand.max}%</span></div>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <label className="text-foreground text-[12px] font-bold tracking-wider uppercase">
                  {t('assetManagement.createProposal.description')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-muted/30 border-border/50 text-body-small-regular text-foreground focus:ring-primary min-h-[100px] w-full resize-y rounded-md border p-3 transition-shadow outline-none focus:ring-1"
                  placeholder="Enter detailed description of your proposal..."
                />
              </div>

              {type === 'BUYOUT_PROPOSAL' && !isEligible && (
                <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-yellow-600"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <p className="text-body-small-regular text-yellow-700 dark:text-yellow-500">
                    You do not yet meet the continuous-holding requirements for a buyout proposal.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={(type === 'BUYOUT_PROPOSAL' && !isEligible) || isCreating}
                  className="text-body-medium-bold w-full rounded-xl px-8 py-2.5 shadow-sm sm:w-auto"
                >
                  {isCreating
                    ? 'Submitting...'
                    : t('assetManagement.createProposal.submit', 'Submit Proposal')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 3. Voting List */}
      <section>
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-h3-bold text-foreground tracking-tight">
            {t('assetManagement.votingList.title', 'Governance History')}
          </h2>
          <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            {activeProposals.filter((p: any) => p.status === 'ACTIVE').length} Active
          </div>
        </div>

        {activeProposals.length === 0 ? (
          <div className="text-muted-foreground border-border bg-muted/5 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 opacity-50"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p className="text-body-medium-medium">
              {t(
                'assetManagement.votingList.noProposals',
                'No active proposals found for this asset.',
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeProposals.map((proposal: any) => {
              const timeLeft =
                proposal.status === 'ACTIVE'
                  ? Math.ceil(
                      (new Date(proposal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                    ) + 'd left'
                  : 'Ended';

              const yesPercent = proposal.votesYes || 0;
              const noPercent = proposal.votesNo || 0;
              const isActive = proposal.status === 'ACTIVE';

              return (
                <div
                  key={proposal.id}
                  className={`bg-background rounded-2xl border ${isActive ? 'border-primary/30 shadow-primary/5 shadow-md' : 'border-border/50 shadow-sm'} hover:border-primary/40 flex flex-col justify-between gap-6 p-6 transition-all md:flex-row md:items-center`}
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-body-large-bold text-foreground leading-tight">
                        {proposal.title}
                      </h3>
                      <span className="bg-muted text-muted-foreground rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                        {proposal.type || t('assetManagement.votingList.buyout', 'Buyout')}
                      </span>
                      <span
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${isActive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}
                      >
                        {proposal.status}
                      </span>
                    </div>

                    <div className="w-full max-w-md">
                      <div className="mb-2 flex justify-between text-[11px] font-bold tracking-wider uppercase">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>{' '}
                          For {yesPercent}%
                        </span>
                        <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>{' '}
                          Against {noPercent}%
                        </span>
                      </div>
                      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full shadow-inner">
                        <div
                          className="h-full bg-green-500 transition-all duration-1000"
                          style={{ width: `${yesPercent}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all duration-1000"
                          style={{ width: `${noPercent}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-muted-foreground flex items-center gap-1.5 text-[12px] font-medium">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {isActive
                        ? t('assetManagement.votingList.endsIn', 'Ends in {{time}}', {
                            time: timeLeft,
                          })
                        : t('assetManagement.votingList.ended', 'Ended')}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {isActive ? (
                      <Button
                        onClick={() => setSelectedProposal(proposal)}
                        className="text-body-medium-bold w-full rounded-xl px-8 py-2.5 shadow-sm md:w-auto"
                      >
                        {t('assetManagement.votingList.voteNow', 'Vote Now')}
                      </Button>
                    ) : (
                      <BuyoutEscrowActions
                        proposalId={proposal.id}
                        proposalStatus={proposal.status}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Slide-over Sheet for Voting */}
      <Sheet
        open={!!selectedProposal}
        onOpenChange={(open) => !open && !isVoting && setSelectedProposal(null)}
      >
        <SheetContent
          side="right"
          className="border-border/50 bg-card flex w-full max-w-md flex-col border-l p-0 sm:max-w-md"
          showCloseButton={true}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 pb-4">
              <SheetHeader className="mt-2 mb-8 p-0 text-left">
                <SheetTitle className="text-h2-semibold tracking-tight">
                  {t('assetManagement.votingList.castVoteTitle', 'Cast Your Vote')}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div className="bg-muted/20 border-border/50 relative overflow-hidden rounded-2xl border p-5">
                  <div className="bg-primary absolute top-0 left-0 h-full w-1" />
                  <h3 className="text-body-large-bold text-foreground mb-2 leading-tight">
                    {selectedProposal?.title}
                  </h3>
                  <p className="text-body-small-regular text-muted-foreground leading-relaxed">
                    {t(
                      'assetManagement.votingList.castVoteDesc',
                      'Review the details carefully before casting your irrevocable vote.',
                    )}
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Voting Rules & Impact
                  </h4>
                  <ul className="text-body-small-regular text-muted-foreground space-y-3">
                    <li className="flex gap-3">
                      <svg
                        className="text-primary mt-0.5 h-4 w-4 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="m9 11 3 3L22 4" />
                      </svg>
                      <span>
                        Voting power is calculated based on your token balance at snapshot block.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <svg
                        className="text-primary mt-0.5 h-4 w-4 flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="m9 11 3 3L22 4" />
                      </svg>
                      <span>
                        This action requires a signature but costs <strong>0 gas</strong>.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                      <span>
                        Votes are final and cannot be changed once broadcasted to the network.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="border-border/50 bg-card sticky bottom-0 border-t p-8 pt-4">
            <div className="flex gap-4">
              <Button
                onClick={() => handleVote(false)}
                disabled={isVoting}
                className="text-body-medium-bold h-12 flex-1 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 shadow-none transition-colors hover:bg-red-500/20 dark:text-red-400"
              >
                {t('assetManagement.votingList.voteNo', 'Vote NO')}
              </Button>
              <Button
                onClick={() => handleVote(true)}
                disabled={isVoting}
                className="text-body-medium-bold h-12 flex-1 rounded-xl border border-green-500/20 bg-green-500/10 text-green-700 shadow-none transition-colors hover:bg-green-500/20 dark:text-green-400"
              >
                {t('assetManagement.votingList.voteYes', 'Vote YES')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AssetDepositFlowSheet
        isOpen={isDepositSheetOpen}
        onOpenChange={setIsDepositSheetOpen}
        asset={asset}
      />

      <AssetWithdrawFlowSheet
        isOpen={isWithdrawSheetOpen}
        onOpenChange={setIsWithdrawSheetOpen}
        asset={asset}
      />

      <ContractTemplateSheet
        isOpen={isTemplateSheetOpen}
        onOpenChange={setIsTemplateSheetOpen}
        type={type}
        assetId={asset?.id}
        userAddress={userAddress}
        assetName={asset?.name}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}
