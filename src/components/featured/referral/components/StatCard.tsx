interface StatCardProps {
  className?: string;
  horizontal?: boolean;
  label: string;
  value: string | number;
}

export const StatCard = ({ label, value, className, horizontal }: StatCardProps) => {
  return (
    <div
      className={`border-border border ${
        horizontal ? 'flex flex-row items-center justify-between rounded px-4 py-3' : 'rounded p-4'
      } ${className ?? ''}`}
    >
      <p className="text-body-large-regular text-muted-foreground">{label}</p>
      <p
        className={`${
          horizontal ? 'text-h4-semibold' : 'text-h4-bold'
        } text-foreground ${horizontal ? '' : 'mt-1'}`}
      >
        {value}
      </p>
    </div>
  );
};
