type EarningsItem = {
  icon: React.ElementType;
  amount: string;
  label: string;
};

interface EarningsCardProps {
  item: EarningsItem;
}

const EarningsCard: React.FC<EarningsCardProps> = ({ item }) => (
  <div className="border-border bg-background flex-1 rounded border p-2">
    <div className="bg-muted text-foreground mb-2 flex h-8 w-8 items-center justify-center rounded-full">
      <item.icon size={20} aria-label={item.label} />
    </div>
    <p className="text-foreground text-lg font-semibold">${item.amount}</p>
    <p className="text-muted-foreground text-sm">{item.label}</p>
  </div>
);

export default EarningsCard;
