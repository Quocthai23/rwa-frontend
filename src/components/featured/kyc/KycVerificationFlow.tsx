'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ChevronLeft, X, UploadCloud02, Camera01, Clock } from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useKyc } from '@/hook/useKyc';
import kycService, { type KycProfile } from '@/services/kycService';
import { fptKycService } from '@/services/fptKycService';
import { cn } from '@/lib/utils';
const emptyProfile: KycProfile = {
  documentType: 'ID_CARD',
  sex: '',
  nationality: '',
  issueDate: '',
  expiryDate: '',
  noExpiry: false,
  issuingAuthority: '',
  phone: '',
  permanentAddress: '',
  residentialAddress: '',
  countryOfResidence: '',
  occupation: '',
  consent: false,
};
type UploadKey = 'idFrontImg' | 'idBackImg' | 'selfieImg';
export function KycVerificationFlow({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { kycStatus, isKycLoading, isKycError, submitKyc, isSubmitting, refetchKyc } = useKyc();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [step, setStep] = useState(0);
  const [person, setPerson] = useState({ fullName: '', dob: '', idNumber: '' });
  const [profile, setProfile] = useState<KycProfile>(emptyProfile);
  const [files, setFiles] = useState<Partial<Record<UploadKey, { file: File; preview: string }>>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const activeUrls = urls.current;
    return () => activeUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const label = (key: string) => t('verification.' + key);
  const waiting = ['PENDING', 'APPROVING'].includes(kycStatus?.status ?? '');
  const [renewing, setRenewing] = useState(false);
  const [renewalWindow] = useState(() => Date.now() + 30 * 86400000);
  const canRenew =
    kycStatus?.status === 'APPROVED' &&
    Boolean(
      kycStatus.documentExpiresAt &&
      new Date(kycStatus.documentExpiresAt).getTime() <= renewalWindow,
    );
  const done = kycStatus?.status === 'APPROVED' && !renewing;
  const chooseFile = (key: UploadKey, file?: File) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError(label('fileError'));
      return;
    }
    const preview = URL.createObjectURL(file);
    urls.current.push(preview);
    setFiles((current) => ({ ...current, [key]: { file, preview } }));
    setError('');
  };
  const upload = (key: UploadKey, camera = false) => (
    <label className="border-border bg-muted/20 hover:border-primary-500 relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed p-4 text-center focus-within:ring-2 focus-within:ring-blue-500">
      {files[key] ? (
        <Image
          unoptimized
          width={600}
          height={400}
          src={files[key]!.preview}
          alt={label(key)}
          className="max-h-44 w-full object-contain"
        />
      ) : (
        <>
          {camera ? (
            <Camera01 className="text-primary-500 size-7" />
          ) : (
            <UploadCloud02 className="text-primary-500 size-7" />
          )}
          <span className="text-sm font-semibold">{label(key)}</span>
          <span className="text-muted-foreground text-xs">{label('fileHint')}</span>
        </>
      )}
      <input
        aria-label={label(key)}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={camera ? 'user' : undefined}
        disabled={busy || isSubmitting}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => chooseFile(key, event.target.files?.[0])}
      />
    </label>
  );
  const field = (key: keyof KycProfile, type = 'text', autoComplete?: string) => (
    <label className="block space-y-1.5">
      <span className="text-foreground text-sm font-medium">{label(key)}</span>
      <Input
        required
        type={type}
        autoComplete={autoComplete}
        value={String(profile[key] ?? '')}
        max={type === 'date' && key === 'issueDate' ? today : undefined}
        min={key === 'expiryDate' ? today : undefined}
        pattern={key === 'phone' ? '\\+[1-9][0-9]{7,14}' : undefined}
        maxLength={
          ['permanentAddress', 'residentialAddress'].includes(key)
            ? 300
            : key === 'occupation'
              ? 120
              : ['nationality', 'countryOfResidence'].includes(key)
                ? 80
                : 160
        }
        onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
        className="h-11 rounded-lg px-3 [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
  const readDocument = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await fptKycService.extractIdInfo(files.idFrontImg!.file);
      const info = result.data?.[0];
      if (result.errorCode !== 0 || !info) throw Error();
      const date = (v: string) =>
        /^\d{2}\/\d{2}\/\d{4}$/.test(v ?? '') ? v.split('/').reverse().join('-') : v;
      setPerson((p) => ({
        ...p,
        fullName: info.name || p.fullName,
        dob: date(info.dob) || p.dob,
        idNumber: info.id || p.idNumber,
      }));
      setProfile((p) => ({
        ...p,
        nationality: info.nationality || p.nationality,
        permanentAddress: info.address || p.permanentAddress,
        issueDate: date(info.issue_date) || p.issueDate,
        issuingAuthority: info.issue_loc || p.issuingAuthority,
      }));
    } catch {
      setError(label('ocrUnavailable'));
    } finally {
      setBusy(false);
      setStep(2);
    }
  };
  const finish = async () => {
    if (!profile.consent || !files.idFrontImg || !files.selfieImg) return;
    setBusy(true);
    setError('');
    try {
      const [front, back, selfie] = await Promise.all([
        kycService.uploadKycImage(files.idFrontImg.file),
        profile.documentType === 'ID_CARD'
          ? kycService.uploadKycImage(files.idBackImg!.file)
          : Promise.resolve(''),
        kycService.uploadKycImage(files.selfieImg.file),
      ]);
      await submitKyc({
        ...person,
        idFrontImg: front,
        idBackImg: back,
        selfieImg: selfie,
        profile: { ...profile, expiryDate: profile.noExpiry ? undefined : profile.expiryDate },
      });
      setStep(5);
      setFiles({});
      setPerson({ fullName: '', dob: '', idNumber: '' });
      setProfile(emptyProfile);
    } catch {
      setError(label('submitError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="bg-background text-foreground flex max-h-[90dvh] min-h-[440px] flex-col"
      aria-busy={busy || isSubmitting}
    >
      <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 sm:px-7">
        <div>
          <p className="text-primary-500 text-xs font-semibold tracking-wider">
            MTX · {label('secureIdentity')}
          </p>
          <h1 className="mt-1 text-lg font-semibold">{label('title')}</h1>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          disabled={busy || isSubmitting}
          className="hover:bg-muted rounded-lg p-2"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="scrollbar-neutral-slim min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        {isKycLoading ? (
          <p role="status">{t('common.loading')}</p>
        ) : isKycError ? (
          <div role="alert">
            <p>{label('loadError')}</p>
            <Button
              variant="neutral-outline"
              onClick={() => refetchKyc()}
              className="mt-3 h-10 px-4"
            >
              {label('refresh')}
            </Button>
          </div>
        ) : step === 5 || done || waiting ? (
          <div className="py-6 text-center">
            <div className="bg-primary-500/10 mx-auto flex size-16 items-center justify-center rounded-full">
              {waiting && step !== 5 ? (
                <Clock className="text-primary-500 size-8" />
              ) : (
                <CheckCircle className="text-primary-500 size-8" />
              )}
            </div>
            <h2 className="mt-5 text-xl font-semibold">
              {label(step === 5 ? 'submittedTitle' : done ? 'approvedTitle' : 'pendingTitle')}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
              {label(done ? 'approvedDescription' : 'pendingDescription')}
            </p>
            {canRenew && (
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">
                  {kycStatus?.documentExpiresAt ? (
                    <>
                      {label('renewalHint')} {kycStatus.documentExpiresAt.slice(0, 10)}
                    </>
                  ) : (
                    label('completeLegacyProfile')
                  )}
                </p>
                <Button
                  variant="primary-contained"
                  className="mt-3 h-11 px-4"
                  onClick={() => {
                    setRenewing(true);
                    setStep(0);
                  }}
                >
                  {label('renew')}
                </Button>
              </div>
            )}
            {waiting && (
              <Button
                variant="neutral-outline"
                className="mt-5 h-10 px-4"
                onClick={() => refetchKyc()}
              >
                {label('refresh')}
              </Button>
            )}
          </div>
        ) : (
          <>
            {step > 0 && (
              <ol className="mb-6 grid grid-cols-4 gap-2">
                {['documents', 'information', 'portrait', 'review'].map((key, i) => (
                  <li
                    key={key}
                    aria-current={step === i + 1 ? 'step' : undefined}
                    className={cn(
                      'border-t-2 pt-2 text-xs',
                      step >= i + 1
                        ? 'border-primary-500 text-primary-500'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {i + 1}. {label(key)}
                  </li>
                ))}
              </ol>
            )}
            {kycStatus?.status === 'REJECTED' && step === 0 && (
              <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                {label('rejected')}: {kycStatus.rejectReason}
              </p>
            )}
            {step === 0 && (
              <>
                <h2 className="text-2xl font-semibold">{label('introTitle')}</h2>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {label('introDescription')}
                </p>
                <div className="mt-6 space-y-3">
                  {['prepareDocument', 'prepareFace', 'prepareDetails'].map((key, i) => (
                    <div key={key} className="border-border flex gap-3 rounded-xl border p-4">
                      <span className="text-primary-500 font-semibold">0{i + 1}</span>
                      <p className="text-sm leading-6">{label(key)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mt-5 text-xs leading-5">{label('privacy')}</p>
              </>
            )}
            {step === 1 && (
              <>
                <label className="mb-5 block space-y-2 text-sm font-medium">
                  {label('documentType')}
                  <select
                    className="border-border bg-background h-11 w-full rounded-lg border px-3"
                    value={profile.documentType}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        documentType: e.target.value as KycProfile['documentType'],
                      }))
                    }
                  >
                    <option value="ID_CARD">{label('idCard')}</option>
                    <option value="PASSPORT">{label('passport')}</option>
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {upload('idFrontImg')}
                  {profile.documentType === 'ID_CARD' && upload('idBackImg')}
                </div>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  {label('documentHint')}
                </p>
              </>
            )}
            {step === 2 && (
              <form
                id="kyc-information"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    person.dob >= today ||
                    profile.issueDate > today ||
                    (!profile.noExpiry &&
                      (!profile.expiryDate ||
                        profile.expiryDate <= today ||
                        profile.expiryDate < profile.issueDate))
                  ) {
                    setError(label('dateError'));
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {(['fullName', 'dob', 'idNumber'] as const).map((key) => (
                  <label key={key} className="block space-y-1.5 text-sm font-medium">
                    {label(key)}
                    <Input
                      required
                      maxLength={key === 'fullName' ? 120 : 40}
                      type={key === 'dob' ? 'date' : 'text'}
                      max={key === 'dob' ? today : undefined}
                      pattern={
                        key === 'idNumber'
                          ? profile.documentType === 'ID_CARD'
                            ? '[0-9]{12}'
                            : '[A-Za-z0-9]{6,20}'
                          : undefined
                      }
                      autoComplete={key === 'fullName' ? 'name' : key === 'dob' ? 'bday' : 'off'}
                      value={person[key]}
                      onChange={(e) => setPerson((p) => ({ ...p, [key]: e.target.value }))}
                      className="h-11 rounded-lg px-3 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </label>
                ))}
                <label className="space-y-1.5 text-sm font-medium">
                  {label('sex')}
                  <select
                    required
                    value={profile.sex}
                    onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value }))}
                    className="border-border bg-background h-11 w-full rounded-lg border px-3"
                  >
                    <option value="">{label('select')}</option>
                    {['MALE', 'FEMALE', 'OTHER'].map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>
                {field('nationality')}
                {field('phone', 'tel', 'tel')}
                {field('issueDate', 'date')}
                {field('issuingAuthority')}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={profile.noExpiry}
                      onChange={(e) => setProfile((p) => ({ ...p, noExpiry: e.target.checked }))}
                    />
                    {label('noExpiry')}
                  </label>
                  {!profile.noExpiry && field('expiryDate', 'date')}
                </div>
                {field('occupation')}
                {field('permanentAddress', 'text', 'street-address')}
                {field('residentialAddress')}
                {field('countryOfResidence', 'text', 'country-name')}
              </form>
            )}
            {step === 3 && (
              <>
                <h2 className="mb-3 text-lg font-semibold">{label('portrait')}</h2>
                {upload('selfieImg', true)}
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  {label('portraitHint')}
                </p>
                <p className="mt-3 rounded-lg bg-blue-500/10 p-3 text-xs leading-5 text-blue-700 dark:text-blue-300">
                  {label('manualReview')}
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <h2 className="mb-4 text-lg font-semibold">{label('reviewTitle')}</h2>
                <dl className="border-border divide-border divide-y rounded-xl border px-4">
                  {Object.entries({ ...person, ...profile })
                    .filter(([key]) => !['consent', 'noExpiry'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                        <dt className="text-muted-foreground">{label(key)}</dt>
                        <dd className="max-w-full font-medium break-words">
                          {key === 'sex' || key === 'documentType'
                            ? label(String(value))
                            : String(value || '—')}
                        </dd>
                      </div>
                    ))}
                </dl>
                <label className="mt-5 flex items-start gap-3 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={profile.consent}
                    onChange={(e) => setProfile((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-1 size-4 shrink-0"
                  />
                  {label('consent')}
                </label>
              </>
            )}
          </>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm leading-6 text-amber-800 dark:text-amber-300"
          >
            {error}
          </p>
        )}
      </div>
      <footer className="border-border bg-background flex shrink-0 gap-3 border-t px-5 py-4 sm:px-7">
        {step > 0 && step < 5 && !done && !waiting && (
          <Button
            variant="neutral-outline"
            disabled={busy || isSubmitting}
            className="h-11 rounded-lg px-4"
            onClick={() => {
              setError('');
              setStep((s) => s - 1);
            }}
          >
            <ChevronLeft className="size-4" />
            {t('common.back')}
          </Button>
        )}
        <Button
          variant="primary-contained"
          className="h-11 flex-1 rounded-lg px-5"
          type={step === 2 ? 'submit' : 'button'}
          form={step === 2 ? 'kyc-information' : undefined}
          disabled={
            busy ||
            isSubmitting ||
            isKycLoading ||
            isKycError ||
            (step === 1 &&
              (!files.idFrontImg || (profile.documentType === 'ID_CARD' && !files.idBackImg))) ||
            (step === 3 && !files.selfieImg) ||
            (step === 4 && !profile.consent)
          }
          onClick={() => {
            if (step === 5 || done || waiting) onClose();
            else if (step === 1) void readDocument();
            else if (step === 4) void finish();
            else if (step !== 2) {
              setError('');
              setStep((s) => s + 1);
            }
          }}
        >
          {busy || isSubmitting
            ? label('processing')
            : step === 5 || done || waiting
              ? t('common.done')
              : step === 4
                ? label('submit')
                : step === 0
                  ? label('start')
                  : t('common.next')}
        </Button>
      </footer>
    </section>
  );
}
