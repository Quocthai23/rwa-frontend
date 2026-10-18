'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { daoApi } from '@/services/daoService';
import { toast } from 'sonner';
import { BuyoutEscrowActions } from './BuyoutEscrowActions';

export default function VotingTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch proposals
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const data = await daoApi.getAllProposals();
      // Handle axios/ky wrapper standard response format if it exists, or just return data
      return Array.isArray(data) ? data : (data as any).data || [];
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ proposalId, isFor }: { proposalId: string; isFor: boolean }) => {
      return daoApi.voteProposal(proposalId, { isFor });
    },
    onSuccess: () => {
      toast.success(t('assetManagement.voting.voteSuccess', 'Vote cast successfully!'));
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || t('assetManagement.voting.voteError', 'Failed to cast vote'));
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground animate-pulse p-12 text-center">
        Loading proposals...
      </div>
    );
  }

  const displayProposals = proposals;

  return (
    <div className="w-full max-w-4xl space-y-8">
      {displayProposals.length === 0 && (
        <div className="text-muted-foreground/70 rounded-2xl border border-dashed p-12 text-center">
          {t('assetManagement.voting.noProposals', {
            defaultValue: 'No active proposals at the moment.',
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {displayProposals.map((proposal: any) => {
          // Attempt to parse metadata for buyout details
          let duration = 0;
          let premium = 0;
          let deposit = 0;

          if (proposal.metadata) {
            try {
              const meta =
                typeof proposal.metadata === 'string'
                  ? JSON.parse(proposal.metadata)
                  : proposal.metadata;
              duration = meta.durationMonths || 0;
              premium = meta.premiumPercent || 0;
              deposit = meta.depositAmount || 0;
            } catch (e) {}
          }

          const isActive = proposal.status === 'ACTIVE';

          return (
            <div
              key={proposal.id}
              className="bg-card text-card-foreground border-border/50 hover:border-primary-500/50 flex flex-col rounded-2xl border p-6 shadow-xl ring-1 shadow-black/5 ring-black/5 transition-all hover:shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-foreground line-clamp-1 text-xl font-bold">
                    {proposal.title || t('assetManagement.voting.title', 'DAO Proposal')}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {proposal.asset?.symbol || 'Unknown Asset'} â€¢{' '}
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600' : 'border-green-500/20 bg-green-500/10 text-green-600'}`}
                >
                  {proposal.status}
                </span>
              </div>

              {proposal.type === 'BUYOUT_PROPOSAL' && (
                <div className="mb-6 grid flex-1 grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                    <p className="text-muted-foreground mb-1">
                      {t('assetManagement.voting.duration', 'Duration')}
                    </p>
                    <p className="text-foreground text-base font-bold">{duration} Months</p>
                  </div>
                  <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                    <p className="text-muted-foreground mb-1">
                      {t('assetManagement.voting.premium', 'Premium')}
                    </p>
                    <p className="text-base font-bold text-green-600 dark:text-green-400">
                      +{premium}%
                    </p>
                  </div>
                  <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                    <p className="text-muted-foreground mb-1">
                      {t('assetManagement.voting.penalty', 'Deposit')}
                    </p>
                    <p className="text-base font-bold text-red-500 dark:text-red-400">
                      {deposit} VNÄ
                    </p>
                  </div>
                  <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                    <p className="text-muted-foreground mb-1">Total Votes</p>
                    <p className="text-foreground text-base font-bold">
                      {proposal._count?.votes || 0}
                    </p>
                  </div>
                </div>
              )}

              {proposal.type !== 'BUYOUT_PROPOSAL' && (
                <div className="text-muted-foreground bg-muted/20 border-border/30 mb-6 flex-1 rounded-xl border p-4 text-sm">
                  <p className="line-clamp-3">{proposal.description}</p>
                  <div className="text-foreground mt-4 text-xs font-semibold">
                    Total Votes: {proposal._count?.votes || 0}
                  </div>
                </div>
              )}

              {isActive && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="red-contained"
                    className="flex-1 border border-red-500/20 bg-red-500/10 text-red-500 shadow-none hover:bg-red-500/20"
                    disabled={voteMutation.isPending}
                    onClick={() => voteMutation.mutate({ proposalId: proposal.id, isFor: false })}
                  >
                    {t('assetManagement.voting.voteNo', 'Reject')}
                  </Button>
                  <Button
                    variant="green-contained"
                    className="flex-1 border border-green-500/20 bg-green-500/10 text-green-500 shadow-none hover:bg-green-500/20"
                    disabled={voteMutation.isPending}
                    onClick={() => voteMutation.mutate({ proposalId: proposal.id, isFor: true })}
                  >
                    {t('assetManagement.voting.voteYes', 'Approve')}
                  </Button>
                </div>
              )}
              {proposal.type === 'BUYOUT_PROPOSAL' && (
                <BuyoutEscrowActions
                  proposalId={proposal.id}
                  proposalStatus={proposal.status}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
