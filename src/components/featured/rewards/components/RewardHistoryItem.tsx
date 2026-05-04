import React from 'react';
import Image from 'next/image';

export type RewardHistoryItemData = {
  pair: string;
  lot: string;
  logo: string;
  amount: string;
};

interface RewardHistoryItemProps {
  item: RewardHistoryItemData;
}

export const RewardHistoryItem: React.FC<RewardHistoryItemProps> = ({ item }) => {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center justify-center">
        <div className="mr-3 h-6 w-6 overflow-hidden rounded-full bg-white/10">
          <Image
            src={item.logo}
            alt={item.pair}
            width={24}
            height={24}
            unoptimized
            className="mr-3 h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-body-large-semibold text-foreground">{item.pair}</p>
          <p className="text-body-large-regular text-muted-foreground">{item.lot} Lot</p>
        </div>
      </div>

      <p className="text-h3-semibold text-green-600">+${item.amount}</p>
    </div>
  );
};
