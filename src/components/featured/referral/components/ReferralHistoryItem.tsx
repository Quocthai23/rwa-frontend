import { ChevronDown, ChevronUp } from '@untitledui/icons';
import React, { useState } from 'react';

interface Item {
  amount: React.ReactNode;
  quantity: React.ReactNode;
  symbol: string;
}

interface ReferralHistoryItemProps {
  details: Item[];
  title: string;
  subtitle: string;
  totalEarned: string;
}

export const ReferralHistoryItem = ({
  details,
  title,
  subtitle,
  totalEarned,
}: ReferralHistoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-background border-border mb-4 overflow-hidden rounded-sm border">
      <div className="flex w-full items-center justify-between p-4 pb-2 text-left">
        <div className="flex-1">
          <p className="text-body-large-semibold text-foreground">{title}</p>
          <p className="text-body-small-regular text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center">
          <h2 className="text-h2-semibold text-green-500">{totalEarned}</h2>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4">
          {details.map((detail, index) => (
            <div key={`${detail.symbol}-${index}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-body-small-regular text-foreground">{detail.symbol}</p>
                <p className="text-body-small-regular text-muted-foreground">
                  {detail.quantity} lots
                </p>
              </div>
              <div className="flex items-center">
                <div className="text-body-small-semibold text-green-500">{detail.amount}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="hover:bg-muted flex w-full px-4 py-2 transition-colors"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span className="text-body-small-semibold text-primary-500 mr-1">
          {isExpanded ? 'Show Less' : 'View details'}
        </span>
        {isExpanded ? (
          <ChevronUp size={20} className="text-primary-500" />
        ) : (
          <ChevronDown size={20} className="text-primary-500" />
        )}
      </button>
    </div>
  );
};
