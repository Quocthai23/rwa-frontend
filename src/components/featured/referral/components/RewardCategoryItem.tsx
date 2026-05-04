import Image from 'next/image';
import { ChevronDown, ChevronUp } from '@untitledui/icons';
import { useMemo, useState } from 'react';

interface Instrument {
  logo?: string;
  ibCommissionPerLot?: string;
  symbol: string;
}

interface RewardCategoryItemProps {
  icon: React.ReactNode;
  instruments: Instrument[];
  label: string;
}

export const RewardCategoryItem = ({ icon, instruments, label }: RewardCategoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const commissionRange = useMemo(() => {
    const values = instruments.map((i) => parseFloat(i.ibCommissionPerLot || '0'));
    const minCommission = values.length ? Math.min(...values) : 0;
    const maxCommission = values.length ? Math.max(...values) : 0;

    return minCommission === maxCommission
      ? `$${minCommission.toFixed(2)}`
      : `$${minCommission.toFixed(2)} – $${maxCommission.toFixed(2)}`;
  }, [instruments]);

  return (
    <div className="bg-background border-border mb-4 overflow-hidden rounded-sm border">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex flex-1 items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center">{icon}</div>
          <p className="text-body-large-semibold text-foreground flex-1">{label}</p>
        </div>

        <div className="flex items-center">
          <div className="mr-3 text-right">
            <p className="text-body-large-regular text-muted-foreground">PER LOT</p>
            <p className="text-body-large-semibold text-foreground">{commissionRange}</p>
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-row flex-wrap gap-2 p-1">
          {instruments.map((instrument, index) => (
            <div
              key={`${instrument.symbol}-${index}`}
              className="bg-card border-border flex items-center justify-center overflow-hidden rounded-sm border p-1"
            >
              {instrument.logo ? (
                <Image
                  src={instrument.logo}
                  alt={instrument.symbol}
                  width={16}
                  height={16}
                  className="mr-1 h-3 w-3 flex-shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span className="text-body-caption-medium text-foreground truncate text-xs">
                {instrument.symbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
