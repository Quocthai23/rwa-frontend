import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Copy01, Check } from '@untitledui/icons';
import Image from 'next/image';

type SecretQrSectionProps = {
  secret: string | null;
  qrDataUrl: string | null;
  onCopySecret: () => void;
  keyLabel: string;
  copyLabel: string;
  qrAlt: string;
  isCopied?: boolean;
};

export default function SecretQrSection({
  secret,
  qrDataUrl,
  onCopySecret,
  keyLabel,
  copyLabel,
  qrAlt,
  isCopied,
}: SecretQrSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full flex-col items-start gap-2">
        <p className="text-body-large-semibold text-foreground">{keyLabel}</p>
        <div className="flex w-full items-center gap-2">
          <Input
            value={secret ?? ''}
            readOnly
            className="text-body-small-medium border-border bg-background text-foreground h-9"
          />
          <Button variant="primary-contained" className="h-9 px-3 py-2" onClick={onCopySecret}>
            {isCopied ? <Check className="size-5" /> : <Copy01 className="size-5" />}
            <p className="text-button-small-medium text-white">{copyLabel}</p>
          </Button>
        </div>
      </div>
      <div>
        <p className="text-body-small-semibold text-primary-500">OR</p>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <p className="text-body-large-semibold text-foreground">QR Code</p>
        <div className="border-border bg-background mx-auto flex w-fit items-center justify-center rounded-xl border p-4">
          {qrDataUrl ? (
            <Image src={qrDataUrl} alt={qrAlt} width={140} height={140} />
          ) : (
            <div className="bg-muted h-[140px] w-[140px] animate-pulse rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
}
