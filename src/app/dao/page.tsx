'use client';

import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { getAssets } from '@/services/assetsService';
import { daoApi, type DaoProposal } from '@/services/daoService';
import type { Asset } from '@/types/assets';
import { Certificate01, PlusCircle, CheckCircle, XCircle } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DaoPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [proposals, setProposals] = useState<DaoProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);

  // New proposal form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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
    async function loadProposals() {
      try {
        const list = await daoApi.getProposals(assetId);
        setProposals(list);
      } catch (err) {
        console.error('Failed to load proposals:', err);
      }
    }
    loadProposals();
  }, [selectedAsset]);

  const handleVote = async (proposalId: string, vote: 'YES' | 'NO') => {
    if (votingProposalId) return;
    setVotingProposalId(proposalId);
    try {
      await daoApi.voteProposal(proposalId, { isFor: vote === 'YES' });
      if (selectedAsset) {
        setProposals(await daoApi.getProposals(selectedAsset.id));
      }
      showSuccess('Vote cast successfully', 'Your vote has been recorded.');
    } catch (err) {
      showError(
        'Voting Failed',
        err instanceof Error ? err.message : 'Unable to record your vote at this time.',
      );
    } finally {
      setVotingProposalId(null);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !title || !description) return;

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const snapshotDate = new Date();
      const endDate = new Date(snapshotDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      await daoApi.createProposal(selectedAsset.id, {
        title,
        description,
        snapshotDate: snapshotDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      setProposals(await daoApi.getProposals(selectedAsset.id));
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      showSuccess('Proposal Created!', 'Your governance proposal is now active for community voting.');
    } catch (err) {
      showError(
        'Failed to create proposal',
        err instanceof Error ? err.message : 'Please verify your inputs and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
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
      <Header label="DAO Governance Portal" onBack={() => router.push('/more')} />

      <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* Banner with stunning gradient and glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 text-white shadow-xl border border-white/10 mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Certificate01 size={24} className="text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Governance Portal</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Shape the Future of RWA Assets</h1>
            <p className="text-sm text-purple-200 max-w-xl">
              Vote on upgrades, extraordinary dividend distributions, and structural parameters for real estate tokens in your portfolio.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none">
            <Certificate01 size={200} />
          </div>
        </div>

        {/* Asset Selector */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Select RWA Asset</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedAsset?.id === asset.id
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg shadow-emerald-500/20 rounded-xl py-5"
          >
            <PlusCircle size={18} />
            <span>Create Proposal</span>
          </Button>
        </div>

        {/* Proposals List */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Active Proposals ({proposals.length})
          </h2>

          {proposals.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground text-sm">No proposals exist for this asset yet.</p>
            </div>
          ) : (
            proposals.map((proposal) => {
              const yesVotes = (proposal.votes ?? [])
                .filter((vote) => vote.isFor)
                .reduce((sum, vote) => sum + Number(vote.votingPower), 0);
              const noVotes = (proposal.votes ?? [])
                .filter((vote) => !vote.isFor)
                .reduce((sum, vote) => sum + Number(vote.votingPower), 0);
              const totalVotes = yesVotes + noVotes;
              const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
              const noPercent = totalVotes > 0 ? 100 - yesPercent : 0;
              const isEnded = new Date(proposal.endDate).getTime() < Date.now();

              return (
                <div key={proposal.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${proposal.status === 'ACTIVE'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                      {proposal.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ends: {new Date(proposal.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground mb-2">{proposal.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{proposal.description}</p>

                  {/* Voting Progress */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle size={14} /> Yes ({yesPercent}%)
                      </span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <XCircle size={14} /> No ({noPercent}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${yesPercent}%` }} />
                      <div className="bg-rose-500 h-full transition-all" style={{ width: `${noPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total Votes: {totalVotes.toLocaleString()}</span>
                      <span>Votes recorded: {proposal._count?.votes ?? proposal.votes?.length ?? 0}</span>
                    </div>
                  </div>

                  {/* Vote Actions */}
                  {!isEnded && proposal.status === 'ACTIVE' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleVote(proposal.id, 'YES')}
                        disabled={votingProposalId === proposal.id}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 rounded-xl"
                      >
                        Vote YES
                      </Button>
                      <Button
                        onClick={() => handleVote(proposal.id, 'NO')}
                        disabled={votingProposalId === proposal.id}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-xl"
                      >
                        Vote NO
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Proposal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Create Governance Proposal</h3>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Purchase fire insurance package for asset custody"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this proposal should pass and its impact..."
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="neutral-outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white rounded-xl"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Proposal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

