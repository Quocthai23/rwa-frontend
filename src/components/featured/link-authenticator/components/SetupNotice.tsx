import { Lightbulb01 } from '@untitledui/icons';

type SetupNoticeProps = {
  message: string;
};

export default function SetupNotice({ message }: SetupNoticeProps) {
  return (
    <div className="border-border bg-muted flex items-start gap-2 rounded border px-3 py-2">
      <Lightbulb01 className="text-yellow-500" size={16} />
      <p className="text-caption-regular text-muted-foreground">{message}</p>
    </div>
  );
}
