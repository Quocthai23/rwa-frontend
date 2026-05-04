import { Check, ChevronDown } from '@untitledui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';

const TRIGGER_OPTIONS = ['price', 'pips', 'changePercent'] as const;

export type TriggerType = (typeof TRIGGER_OPTIONS)[number];

type TradePanelTriggerSelectProps = {
  triggerType: TriggerType;
  setTriggerType: (value: TriggerType) => void;
  onBeforeTriggerTypeChange?: () => void;
  triggerLabel: string;
  getTriggerTypeOptionLabel: (type: TriggerType) => string;
  className?: string;
};

export function TradePanelTriggerSelect({
  triggerType,
  setTriggerType,
  onBeforeTriggerTypeChange,
  triggerLabel,
  getTriggerTypeOptionLabel,
  className = 'mx-4',
}: TradePanelTriggerSelectProps) {
  const selectTrigger = (next: TriggerType) => {
    if (next === triggerType) return;
    onBeforeTriggerTypeChange?.();
    setTriggerType(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <div className="bg-card flex items-center justify-between rounded px-3 py-2">
          <span className="text-body-small-medium text-muted-foreground">{triggerLabel}</span>
          <div className="flex items-center gap-1">
            <span className="text-body-small-medium text-foreground">
              {getTriggerTypeOptionLabel(triggerType)}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-background w-(--radix-dropdown-menu-trigger-width) border-none shadow"
        align="start"
      >
        {TRIGGER_OPTIONS.map((option) => {
          const isSelected = triggerType === option;
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => selectTrigger(option)}
              className={`hover:bg-muted focus:bg-muted data-highlighted:bg-muted cursor-pointer transition-colors ${isSelected ? 'bg-muted text-primary-500' : ''}`}
            >
              <div className="flex min-w-full items-center justify-between">
                <span
                  className={`text-body-small-medium ${isSelected ? 'text-primary-500' : 'text-foreground'}`}
                >
                  {getTriggerTypeOptionLabel(option)}
                </span>
                <div>{isSelected && <Check size={24} className="text-primary-500 ml-auto" />}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
