import { InfoHexagon, Trash01 } from '@untitledui/icons';
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import SecretQrSection from '@/components/featured/link-authenticator/components/SecretQrSection';
import SetupNotice from '@/components/featured/link-authenticator/components/SetupNotice';
import StepItem from '@/components/featured/link-authenticator/components/StepItem';

import { OtpInputs } from './OtpInputs';
import { SheetTopBar } from './SheetTopBar';
import type { AuthenticatorStage } from './types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

type AuthenticatorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeAuthenticatorSheet: () => void;
  t: Translate;
  enabledMfa: boolean | null;
  authenticatorStage: AuthenticatorStage;
  setAuthenticatorStage: (stage: AuthenticatorStage) => void;
  setIsDisableConfirmOpen: (open: boolean) => void;
  authenticatorAddedOn: string;
  handleOpenRemoveAuthenticator: () => void;
  authenticatorDigits: string[];
  handleAuthenticatorDigitChange: (index: number, value: string) => void;
  handleAuthenticatorDigitPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  handleAuthenticatorDigitKeyDown: (event: KeyboardEvent<HTMLInputElement>, index: number) => void;
  authenticatorSetupReady: boolean;
  isAuthenticatorWorking: boolean;
  verifyDisableAuthenticator: () => void;
  verifyAuthenticatorSetup: () => void;
  authenticatorQrDataUrl: string | null;
  authenticatorSecret: string | null;
  isCopyingSecret: boolean;
  onCopySecret: () => void | Promise<void>;
  continueToAuthenticatorVerify: () => void;
  startAuthenticatorSetup: () => void;
};

export function AuthenticatorSheet({
  open,
  onOpenChange,
  closeAuthenticatorSheet,
  t,
  enabledMfa,
  authenticatorStage,
  setAuthenticatorStage,
  setIsDisableConfirmOpen,
  authenticatorAddedOn,
  handleOpenRemoveAuthenticator,
  authenticatorDigits,
  handleAuthenticatorDigitChange,
  handleAuthenticatorDigitPaste,
  handleAuthenticatorDigitKeyDown,
  authenticatorSetupReady,
  isAuthenticatorWorking,
  verifyDisableAuthenticator,
  verifyAuthenticatorSetup,
  authenticatorQrDataUrl,
  authenticatorSecret,
  isCopyingSecret,
  onCopySecret,
  continueToAuthenticatorVerify,
  startAuthenticatorSetup,
}: AuthenticatorSheetProps) {
  const [isSecretCopied, setIsSecretCopied] = useState(false);
  const otpContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSecretCopied) return;
    const timer = window.setTimeout(() => setIsSecretCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [isSecretCopied]);

  useEffect(() => {
    setIsSecretCopied(false);
  }, [authenticatorSecret, authenticatorStage]);

  const handleCopySecretClick = async () => {
    try {
      await onCopySecret();
      setIsSecretCopied(true);
    } catch {
      setIsSecretCopied(false);
    }
  };

  const focusOtpInput = (index: number) => {
    const inputs = otpContainerRef.current?.querySelectorAll<HTMLInputElement>('input');
    inputs?.[index]?.focus();
    inputs?.[index]?.select?.();
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    handleAuthenticatorDigitChange(index, nextValue);

    if (nextValue && index < authenticatorDigits.length - 1) {
      window.requestAnimationFrame(() => focusOtpInput(index + 1));
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !authenticatorDigits[index] && index > 0) {
      event.preventDefault();
      handleAuthenticatorDigitChange(index - 1, '');
      window.requestAnimationFrame(() => focusOtpInput(index - 1));
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      handleAuthenticatorDigitChange(index, '');
      return;
    }

    handleAuthenticatorDigitKeyDown(event, index);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto my-auto flex h-[80%] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border p-0"
        showCloseButton={false}
        title={t('security.authenticatorApp.title', {
          defaultValue: 'Verify via Authenticator App',
        })}
      >
        <SheetTopBar
          title={
            authenticatorStage === 'setup-link'
              ? t('security.linkAuthenticator.header.title', { defaultValue: 'Link Authenticator' })
              : authenticatorStage === 'setup-verify'
                ? t('security.verifyAuthenticator.header.verifyTitle', {
                    defaultValue: 'Verify via Authenticator App',
                  })
                : authenticatorStage === 'disable-verify'
                  ? t('security.verifyAuthenticator.header.disableTitle', {
                      defaultValue: 'Disable Authenticator App',
                    })
                  : t('security.authenticatorApp.title', {
                      defaultValue: 'Verify via Authenticator App',
                    })
          }
          onBack={
            authenticatorStage === 'setup-link'
              ? () => setAuthenticatorStage('setup-email')
              : authenticatorStage === 'setup-verify'
                ? () => setAuthenticatorStage('setup-link')
                : authenticatorStage === 'disable-verify'
                  ? () => setIsDisableConfirmOpen(true)
                  : undefined
          }
          onClose={closeAuthenticatorSheet}
        />

        <div className="scrollbar-neutral-slim flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          {enabledMfa ? (
            authenticatorStage === 'overview' ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-body-large-semibold text-foreground">
                      {t('security.authenticatorApp.labels.authenticatorApp', {
                        defaultValue: 'Authenticator App',
                      })}
                    </p>
                    <p className="text-body-large-regular text-muted-foreground">
                      {t('security.authenticatorApp.labels.addedOn', {
                        defaultValue: 'Added on: {{date}}',
                        date: authenticatorAddedOn,
                      })}
                    </p>
                  </div>
                  <Button variant="white-contained" onClick={handleOpenRemoveAuthenticator}>
                    <Trash01 className="size-6" />
                  </Button>
                </div>

                <div className="border-border bg-muted/30 rounded-2xl border p-4">
                  <p className="text-body-large-semibold text-foreground mb-2">
                    {t('security.authenticatorApp.guide.title', {
                      defaultValue: 'Authenticator app is active',
                    })}
                  </p>
                  <p className="text-body-small-regular text-muted-foreground">
                    {t('security.authenticatorApp.description', {
                      defaultValue:
                        'Use an authenticator app for stronger verification when signing in or confirming sensitive actions.',
                    })}
                  </p>
                </div>
              </>
            ) : authenticatorStage === 'disable-verify' ? (
              <div className="flex h-screen flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('security.verifyAuthenticator.descriptions.emailOtp', {
                      defaultValue: 'Enter the 6-digit verification code sent to your email.',
                    })}
                  </p>
                </div>

                <div ref={otpContainerRef} className="w-full">
                  <OtpInputs
                    digits={authenticatorDigits}
                    onChange={handleOtpChange}
                    onPaste={handleAuthenticatorDigitPaste}
                    onKeyDown={handleOtpKeyDown}
                  />
                </div>

                <Button
                  variant="primary-contained"
                  className="mt-auto flex w-full justify-center px-8 py-3 pt-4"
                  disabled={!authenticatorSetupReady || isAuthenticatorWorking}
                  onClick={verifyDisableAuthenticator}
                >
                  {isAuthenticatorWorking
                    ? t('security.verifyAuthenticator.actions.processing', {
                        defaultValue: 'Processing...',
                      })
                    : t('security.verifyAuthenticator.actions.verify', {
                        defaultValue: 'Verify',
                      })}
                </Button>
              </div>
            ) : null
          ) : authenticatorStage === 'setup-email' ? (
            <div className="flex h-screen flex-col gap-4">
              <p className="text-body-small-medium text-muted-foreground text-center">
                {t('security.authenticatorApp.confirmEmail.description', {
                  defaultValue:
                    'Please enter the 6-digit verification code sent to your registered email.',
                })}
              </p>

              <div ref={otpContainerRef} className="w-full">
                <OtpInputs
                  digits={authenticatorDigits}
                  onChange={handleOtpChange}
                  onPaste={handleAuthenticatorDigitPaste}
                  onKeyDown={handleOtpKeyDown}
                />
              </div>

              <div className="mt-auto flex justify-center pt-4">
                <Button
                  variant="primary-contained"
                  className="w-full px-8 py-3"
                  disabled={!authenticatorSetupReady || isAuthenticatorWorking}
                  onClick={verifyAuthenticatorSetup}
                >
                  {isAuthenticatorWorking
                    ? t('security.authenticatorApp.actions.verifying', {
                        defaultValue: 'Verifying...',
                      })
                    : t('security.authenticatorApp.actions.verify', {
                        defaultValue: 'Verify',
                      })}
                </Button>
              </div>
            </div>
          ) : authenticatorStage === 'setup-link' ? (
            <div className="flex h-screen flex-col gap-5">
              <StepItem
                step="01"
                text={t('security.linkAuthenticator.steps.step1', {
                  defaultValue: 'Copy the 32-digit code. Alternatively, you can scan the QR code.',
                })}
              />

              <SecretQrSection
                secret={authenticatorSecret}
                qrDataUrl={authenticatorQrDataUrl}
                onCopySecret={handleCopySecretClick}
                keyLabel={t('security.linkAuthenticator.labels.key32', {
                  defaultValue: '32-character Key:',
                })}
                copyLabel={
                  isSecretCopied
                    ? t('security.linkAuthenticator.actions.copied', { defaultValue: 'Copied' })
                    : t('security.linkAuthenticator.actions.copy', { defaultValue: 'Copy' })
                }
                isCopied={isSecretCopied}
                qrAlt={t('security.linkAuthenticator.labels.qrAlt', {
                  defaultValue: 'Authenticator QR',
                })}
              />

              <StepItem
                step="02"
                text={t('security.linkAuthenticator.steps.step2', {
                  defaultValue: 'Open Authenticator and add the 32-digit key you copied.',
                })}
              />

              <StepItem
                step="03"
                text={t('security.linkAuthenticator.steps.step3', {
                  defaultValue: 'Return and verify the new authenticator in MTX Trading App.',
                })}
              />

              <SetupNotice
                message={t('security.linkAuthenticator.notice.completedStep2', {
                  defaultValue: 'Please ensure you have completed step 2 before clicking next.',
                })}
              />

              <div className="mt-auto flex justify-center">
                <Button
                  variant="primary-contained"
                  className="w-full px-8 py-3"
                  onClick={continueToAuthenticatorVerify}
                >
                  {t('security.linkAuthenticator.actions.continue', {
                    defaultValue: 'Continue',
                  })}
                </Button>
              </div>
            </div>
          ) : authenticatorStage === 'setup-verify' ? (
            <div className="flex h-screen flex-col gap-4">
              <p className="text-body-small-medium text-muted-foreground text-center">
                {t('security.verifyAuthenticator.descriptions.totp', {
                  defaultValue:
                    'Enter the 6-digit verification code generated by your Authenticator App.',
                })}
              </p>

              <div ref={otpContainerRef} className="w-full">
                <OtpInputs
                  digits={authenticatorDigits}
                  onChange={handleOtpChange}
                  onPaste={handleAuthenticatorDigitPaste}
                  onKeyDown={handleOtpKeyDown}
                />
              </div>

              <div className="mt-auto flex w-full justify-center pt-4">
                <Button
                  variant="primary-contained"
                  className="w-full px-8 py-3"
                  disabled={!authenticatorSetupReady || isAuthenticatorWorking}
                  onClick={verifyAuthenticatorSetup}
                >
                  {isAuthenticatorWorking
                    ? t('security.verifyAuthenticator.actions.processing', {
                        defaultValue: 'Processing...',
                      })
                    : t('security.verifyAuthenticator.actions.verify', {
                        defaultValue: 'Verify',
                      })}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-body-large-semibold text-foreground">
                    {t('security.authenticatorApp.title', {
                      defaultValue: 'Verify via Authenticator App',
                    })}
                  </p>
                  <p className="text-body-large-regular text-muted-foreground">
                    {t('security.authenticatorApp.description', {
                      defaultValue:
                        'Use authenticator apps like Google Authenticator for codes instead of SMS.',
                    })}
                  </p>
                </div>
                <div className="bg-muted/40 flex h-24 w-24 items-center justify-center rounded-full">
                  <InfoHexagon className="text-primary-500 size-9" />
                </div>
              </div>

              <div className="border-border bg-muted/20 rounded-2xl border p-4">
                <p className="text-body-large-semibold text-foreground mb-2">
                  {t('security.authenticatorApp.guide.title', {
                    defaultValue: 'How to enable Authenticator app',
                  })}
                </p>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('security.authenticatorApp.guide.learnMore', {
                    defaultValue: 'Learn more',
                  })}
                </p>
              </div>

              <div className="mt-auto pt-2">
                <Button
                  variant="primary-contained"
                  className="w-full py-3"
                  onClick={startAuthenticatorSetup}
                  disabled={isAuthenticatorWorking}
                >
                  {isAuthenticatorWorking
                    ? t('security.authenticatorApp.actions.creating', {
                        defaultValue: 'Creating...',
                      })
                    : t('security.authenticatorApp.actions.activate', {
                        defaultValue: 'Activate',
                      })}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
