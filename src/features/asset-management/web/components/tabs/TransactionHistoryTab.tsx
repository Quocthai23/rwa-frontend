'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '@/i18n/formatting';
import { ChevronRight } from '@untitledui/icons';

import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useAssetStatus, useAssetTransactions } from '@/hook/useAssetManagement';
import type { AssetTransactionItem } from '@/services/assetManagementService';
import type { Asset } from '@/types/assets';
import { formatBalance } from '@/utils/currency';
import { AssetEntryDetailDialog } from '../AssetEntryDetailDialog';

export default function TransactionHistoryTab({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation();
  const [selectedTransaction, setSelectedTransaction] = useState<AssetTransactionItem | null>(null);
  const { data: transactions = [], isLoading, isError } = useAssetTransactions(asset.id);
  const { data: status, isLoading: statusLoading } = useAssetStatus(asset.id);
  const locale = getIntlLocale(i18n.resolvedLanguage ?? i18n.language);

  if (isLoading || statusLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t('assetManagement.transactionHistory.contractBalance', {
              defaultValue: 'Contract balance',
            })}
          </p>
          <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
            {status?.treasuryBalance == null
              ? t('assetManagement.transactionHistory.notConfigured')
              : `${formatBalance(status.treasuryBalance)} ${status.treasuryCurrency ?? ''}`}
          </p>
          {status?.treasuryStatus === 'NOT_CONFIGURED' ? (
            <p className="text-muted-foreground mt-1 max-w-2xl text-xs">
              {t('assetManagement.transactionHistory.treasuryUnavailable')}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-5">
          <h2 className="text-foreground text-base font-semibold">
            {t('assetManagement.transactionHistory.title', {
              defaultValue: 'Cash flow and transactions',
            })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('assetManagement.transactionHistory.desc', {
              defaultValue: 'Token trades and settled financial movements recorded for this asset.',
            })}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {t('assetManagement.transactionHistory.statusExplanation')}
          </p>
        </div>

        {isError ? (
          <Empty
            text={t('assetManagement.transactionHistory.loadError', {
              defaultValue: 'Unable to load transaction history.',
            })}
          />
        ) : transactions.length === 0 ? (
          <Empty
            text={t('assetManagement.transactionHistory.empty', {
              defaultValue: 'No asset transactions have been recorded.',
            })}
          />
        ) : (
          <div className="border-border overflow-x-auto border">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    {t('assetManagement.transactionHistory.time', { defaultValue: 'Time' })}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t('assetManagement.transactionHistory.type', { defaultValue: 'Type' })}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t('assetManagement.transactionHistory.quantity', { defaultValue: 'Quantity' })}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t('assetManagement.transactionHistory.price', { defaultValue: 'Price' })}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t('assetManagement.transactionHistory.value', { defaultValue: 'Value' })}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t('assetManagement.transactionHistory.status', { defaultValue: 'Status' })}
                  </th>
                  <th className="w-10 px-3 py-3">
                    <span className="sr-only">
                      {t('assetManagement.details.viewDetails', { defaultValue: 'View details' })}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedTransaction(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTransaction(item);
                      }
                    }}
                    className="border-border hover:bg-muted/40 focus-visible:bg-muted/40 cursor-pointer border-t transition-colors outline-none"
                  >
                    <td className="text-muted-foreground px-4 py-3 text-left">
                      {new Date(item.createdAt).toLocaleString(locale)}
                    </td>
                    <td className="text-foreground px-4 py-3 text-left">
                      {t('assetManagement.transactionHistory.tokenTrade', {
                        defaultValue: 'Token trade',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatBalance(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatBalance(item.price)} VND
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatBalance(item.amount)} VND
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-foreground text-xs font-medium">
                        {t(`assetManagement.statuses.${item.ledgerStatus}`, {
                          defaultValue: item.ledgerStatus,
                        })}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-[11px]">
                        {item.blockchainSettlementEnabled
                          ? t(
                              `assetManagement.transactionHistory.blockchainStatuses.${item.blockchainSettlementStatus}`,
                              { defaultValue: item.blockchainSettlementStatus },
                            )
                          : t('assetManagement.transactionHistory.blockchainDisabled')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTransaction(item);
                        }}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        aria-label={t('assetManagement.details.openTransaction', {
                          defaultValue: 'View transaction details',
                        })}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTransaction ? (
        <AssetEntryDetailDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedTransaction(null);
          }}
          eyebrow={t('assetManagement.transactionHistory.title')}
          title={t('assetManagement.details.transactionTitle', {
            defaultValue: 'Transaction details',
          })}
          description={t('assetManagement.details.transactionDescription', {
            asset: asset.symbol || asset.name,
            defaultValue: `Ledger and settlement details for ${asset.symbol || asset.name}.`,
          })}
          status={t(`assetManagement.statuses.${selectedTransaction.ledgerStatus}`, {
            defaultValue: selectedTransaction.ledgerStatus,
          })}
          fields={[
            {
              label: t('assetManagement.transactionHistory.type'),
              value: t('assetManagement.transactionHistory.tokenTrade'),
            },
            {
              label: t('assetManagement.transactionHistory.time'),
              value: new Date(selectedTransaction.createdAt).toLocaleString(locale),
            },
            {
              label: t('assetManagement.transactionHistory.quantity'),
              value: `${formatBalance(selectedTransaction.quantity)} token`,
            },
            {
              label: t('assetManagement.transactionHistory.price'),
              value: `${formatBalance(selectedTransaction.price)} ${selectedTransaction.currency}`,
            },
            {
              label: t('assetManagement.transactionHistory.value'),
              value: `${formatBalance(selectedTransaction.amount)} ${selectedTransaction.currency}`,
            },
            {
              label: t('assetManagement.details.ledgerStatus', { defaultValue: 'Ledger status' }),
              value: t(`assetManagement.statuses.${selectedTransaction.ledgerStatus}`, {
                defaultValue: selectedTransaction.ledgerStatus,
              }),
            },
            {
              label: t('assetManagement.details.blockchainStatus', {
                defaultValue: 'Blockchain status',
              }),
              value: selectedTransaction.blockchainSettlementEnabled
                ? t(
                    `assetManagement.transactionHistory.blockchainStatuses.${selectedTransaction.blockchainSettlementStatus}`,
                    { defaultValue: selectedTransaction.blockchainSettlementStatus },
                  )
                : t('assetManagement.transactionHistory.blockchainDisabled'),
              wide: true,
            },
            ...(selectedTransaction.txHash
              ? [
                  {
                    label: t('assetManagement.details.transactionHash', {
                      defaultValue: 'Transaction hash',
                    }),
                    value: selectedTransaction.txHash,
                    wide: true,
                    mono: true,
                  },
                ]
              : []),
            {
              label: t('assetManagement.details.transactionId', {
                defaultValue: 'Transaction ID',
              }),
              value: selectedTransaction.id,
              wide: true,
              mono: true,
            },
          ]}
          closeLabel={t('assetManagement.details.close', { defaultValue: 'Close' })}
        />
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground border border-dashed px-5 py-16 text-center text-sm">
      {text}
    </div>
  );
}
