import type { ClipboardEvent, KeyboardEvent } from 'react';

const OTP_DIGITS_LENGTH = 6;

type OtpInputsProps = {
  digits: string[];
  onChange: (index: number, value: string) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, index: number) => void;
};

export function OtpInputs({ digits, onChange, onPaste, onKeyDown }: OtpInputsProps) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: OTP_DIGITS_LENGTH }).map((_, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(event) => onChange(index, event.target.value)}
          onPaste={onPaste}
          onKeyDown={(event) => onKeyDown(event, index)}
          className="border-border h-10 w-10 rounded border text-center dark:border-neutral-700 dark:bg-neutral-800"
        />
      ))}
    </div>
  );
}
