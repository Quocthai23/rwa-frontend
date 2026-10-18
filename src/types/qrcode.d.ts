declare module 'qrcode' {
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

  type ToDataUrlOptions = {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  };

  export function toDataURL(
    text: string,
    options?: ToDataUrlOptions,
  ): Promise<string>;

  const QRCode: { toDataURL: typeof toDataURL };

  export default QRCode;
}
