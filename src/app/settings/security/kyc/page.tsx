'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  UploadCloud02, 
  CheckCircle, 
  XCircle,
  Clock,
  Camera01,
  User01,
  File02,
  AlertCircle
} from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import Header from '@/components/shared/Header';
import { useKyc } from '@/hook/useKyc';
import kycService from '@/services/kycService';
import { useToast } from '@/hook/useToast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type KycStep = 'overview' | 'form' | 'upload-id' | 'upload-selfie' | 'success';

export default function KycPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { kycStatus, submitKyc, isSubmitting } = useKyc();
  const { showError, showSuccess } = useToast();
  
  const [step, setStep] = useState<KycStep>('overview');
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    idNumber: '',
  });
  
  const [images, setImages] = useState({
    idFrontImg: '',
    idBackImg: '',
    selfieImg: '',
  });
  
  const [isUploading, setIsUploading] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: keyof typeof images) => {
    setIsUploading(true);
    try {
      const url = await kycService.uploadKycImage(file);
      setImages(prev => ({ ...prev, [type]: url }));
      showSuccess(t('common.success'), t('kyc.uploadSuccess', 'Image uploaded successfully'));
    } catch (error) {
      showError(t('common.error'), t('kyc.uploadFailed', 'Could not upload image. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinish = async () => {
    if (!formData.fullName || !formData.dob || !formData.idNumber) {
      showError(t('common.error'), t('kyc.error.missingInfo', 'Please fill in all personal information.'));
      return;
    }
    if (!images.idFrontImg || !images.idBackImg || !images.selfieImg) {
      showError(t('common.error'), t('kyc.error.missingDocs', 'Please upload all required photos.'));
      return;
    }

    try {
      await submitKyc({
        ...formData,
        ...images
      });
      setStep('success');
    } catch (error) {
      showError(t('common.error'), t('kyc.error.submitFailed', 'Failed to submit KYC documents.'));
    }
  };

  const renderOverview = () => {
    if (kycStatus?.status === 'APPROVED') {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-8">
            <CheckCircle size={56} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.verified', 'Account Verified')}</h3>
          <p className="text-muted-foreground mt-4 text-lg">
            {t('kyc.status.verifiedDesc', 'Your identity has been successfully verified. You now have full access to all features.')}
          </p>
          <Button className="mt-16 w-full h-14 text-lg font-bold" variant="primary-contained" onClick={() => router.back()}>
            {t('common.done', 'Done')}
          </Button>
        </div>
      );
    }

    if (kycStatus?.status === 'PENDING') {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-24 h-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-8">
            <Clock size={56} className="text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.pending', 'Verification Pending')}</h3>
          <p className="text-muted-foreground mt-4 text-lg">
            {t('kyc.status.pendingDesc', 'We are currently reviewing your documents. This process usually takes 24-48 hours.')}
          </p>
          <Button className="mt-16 w-full h-14 text-lg font-bold" variant="neutral-outline" onClick={() => router.back()}>
            {t('common.goBack', 'Go Back')}
          </Button>
        </div>
      );
    }

    if (kycStatus?.status === 'REJECTED') {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-8">
            <XCircle size={56} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.rejected', 'Verification Rejected')}</h3>
          <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl mt-6 w-full text-left">
            <p className="text-red-600 dark:text-red-400 font-bold text-sm mb-1">{t('kyc.status.reason', 'Reason')}:</p>
            <p className="text-red-600/80 dark:text-red-400/80 text-sm">
              {kycStatus.rejectReason || t('kyc.status.defaultReason', 'Documents were unclear or invalid')}
            </p>
          </div>
          <p className="text-muted-foreground mt-6 text-base">
            {t('kyc.status.tryAgainDesc', 'Please ensure all information matches your ID and photos are clear.')}
          </p>
          <Button className="mt-12 w-full h-14 text-lg font-bold" variant="primary-contained" onClick={() => setStep('form')}>
            {t('kyc.tryAgain', 'Try Again')}
          </Button>
        </div>
      );
    }

    return (
      <div className="px-6 py-8">
        <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-2xl mb-8 border border-primary-100 dark:border-primary-900/20">
          <h4 className="font-bold text-xl text-primary-700 dark:text-primary-400">{t('kyc.benefits.title', 'Identity Verification')}</h4>
          <p className="text-muted-foreground mt-2 mb-6">{t('kyc.desc', 'Complete verification to unlock full access to RWA assets and higher limits.')}</p>
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm">
                <CheckCircle size={20} className="text-primary-500" />
              </div>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">{t('kyc.benefits.withdrawal', 'High withdrawal limits')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm">
                <CheckCircle size={20} className="text-primary-500" />
              </div>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">{t('kyc.benefits.assets', 'Full marketplace access')}</span>
            </li>
            <li className="flex items-center gap-4">
              <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-sm">
                <CheckCircle size={20} className="text-primary-500" />
              </div>
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">{t('kyc.benefits.security', 'Enhanced account security')}</span>
            </li>
          </ul>
        </div>
        <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary-500/20" variant="primary-contained" onClick={() => setStep('form')}>
          {t('kyc.start', 'Start Verification')}
        </Button>
      </div>
    );
  };

  const renderForm = () => (
    <div className="space-y-6 px-6 py-8">
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground ml-1">{t('kyc.form.fullName', 'Full Legal Name')}</label>
        <Input 
          className="h-14 text-lg bg-muted/20"
          placeholder={t('kyc.form.fullNamePlaceholder', 'As it appears on ID')}
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground ml-1">{t('kyc.form.dob', 'Date of Birth')}</label>
        <Input 
          className="h-14 text-lg bg-muted/20"
          type="date"
          value={formData.dob}
          onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-foreground ml-1">{t('kyc.form.idNumber', 'ID Number')}</label>
        <Input 
          className="h-14 text-lg bg-muted/20"
          placeholder={t('kyc.form.idPlaceholder', 'National ID / Passport / DL')}
          value={formData.idNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
        />
      </div>
      <div className="pt-8">
        <Button 
          className="w-full h-14 text-lg font-bold shadow-lg shadow-primary-500/20" 
          variant="primary-contained" 
          onClick={() => setStep('upload-id')}
          disabled={!formData.fullName || !formData.dob || !formData.idNumber}
        >
          {t('common.next', 'Next: Upload ID')}
        </Button>
      </div>
    </div>
  );

  const renderUploadId = () => (
    <div className="space-y-8 px-6 py-8 pb-32">
      <div className="space-y-3">
        <label className="text-base font-bold text-foreground ml-1">{t('kyc.form.idFront', 'Front side of ID')}</label>
        <div 
          className={cn(
            "border-2 border-dashed rounded-2xl h-52 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
            images.idFrontImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
          )}
          onClick={() => frontInputRef.current?.click()}
        >
          {images.idFrontImg ? (
            <Image src={images.idFrontImg} alt="ID Front" fill className="object-cover" />
          ) : (
            <>
              <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud02 size={32} className="text-primary-500" />
              </div>
              <span className="text-sm font-bold text-foreground">{t('kyc.upload.front', 'Upload Front Side')}</span>
              <span className="text-xs text-muted-foreground mt-1 px-4 text-center">{t('kyc.upload.hint', 'Ensure all details are clearly visible')}</span>
            </>
          )}
          <input 
            type="file" 
            ref={frontInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'idFrontImg')}
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <label className="text-base font-bold text-foreground ml-1">{t('kyc.form.idBack', 'Back side of ID')}</label>
        <div 
          className={cn(
            "border-2 border-dashed rounded-2xl h-52 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
            images.idBackImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
          )}
          onClick={() => backInputRef.current?.click()}
        >
          {images.idBackImg ? (
            <Image src={images.idBackImg} alt="ID Back" fill className="object-cover" />
          ) : (
            <>
              <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud02 size={32} className="text-primary-500" />
              </div>
              <span className="text-sm font-bold text-foreground">{t('kyc.upload.back', 'Upload Back Side')}</span>
              <span className="text-xs text-muted-foreground mt-1 px-4 text-center">{t('kyc.upload.hint', 'Ensure all details are clearly visible')}</span>
            </>
          )}
          <input 
            type="file" 
            ref={backInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'idBackImg')}
          />
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-md border-t border-border flex gap-4 z-10">
        <Button variant="neutral-outline" className="flex-1 h-14 font-bold rounded-xl" onClick={() => setStep('form')}>{t('common.back', 'Back')}</Button>
        <Button 
          variant="primary-contained" 
          className="flex-[2] h-14 font-bold rounded-xl shadow-lg shadow-primary-500/20" 
          onClick={() => setStep('upload-selfie')}
          disabled={!images.idFrontImg || !images.idBackImg || isUploading}
        >
          {isUploading ? t('common.uploading', 'Uploading...') : t('common.next', 'Next: Selfie')}
        </Button>
      </div>
    </div>
  );

  const renderUploadSelfie = () => (
    <div className="space-y-6 px-6 py-8 flex flex-col min-h-[calc(100vh-100px)] pb-32">
      <div className="text-center mb-2">
        <p className="text-neutral-600 dark:text-neutral-400 text-base">{t('kyc.selfie.hint', 'Hold your ID document next to your face and take a clear photo.')}</p>
      </div>
      
      <div 
        className={cn(
          "border-2 border-dashed rounded-3xl flex-1 min-h-[300px] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
          images.selfieImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
        )}
        onClick={() => selfieInputRef.current?.click()}
      >
        {images.selfieImg ? (
          <Image src={images.selfieImg} alt="Selfie" fill className="object-cover" />
        ) : (
          <>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Camera01 size={56} className="text-primary-500" />
            </div>
            <span className="text-xl font-bold text-foreground">{t('kyc.upload.takeSelfie', 'Take Selfie')}</span>
            <span className="text-sm text-muted-foreground mt-2 px-8 text-center">{t('kyc.selfie.captureHint', 'Tap to open camera. Ensure your face is within the frame.')}</span>
          </>
        )}
        <input 
          type="file" 
          ref={selfieInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="user"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'selfieImg')}
        />
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-md border-t border-border flex gap-4 z-10">
        <Button variant="neutral-outline" className="flex-1 h-14 font-bold rounded-xl" onClick={() => setStep('upload-id')}>{t('common.back', 'Back')}</Button>
        <Button 
          variant="primary-contained" 
          className="flex-[2] h-14 font-bold rounded-xl shadow-lg shadow-primary-500/20" 
          onClick={handleFinish}
          disabled={!images.selfieImg || isUploading || isSubmitting}
        >
          {isSubmitting ? t('common.submitting', 'Submitting...') : t('kyc.finish', 'Finish')}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center h-full">
      <div className="w-28 h-28 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle size={64} className="text-primary-500" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">{t('kyc.success.title', 'Submission Received')}</h3>
      <p className="text-muted-foreground mt-4 text-lg">
        {t('kyc.success.desc', 'Your identity verification is being processed. We will notify you once the review is complete.')}
      </p>
      <Button className="mt-16 w-full h-14 text-lg font-bold shadow-lg shadow-primary-500/20" variant="primary-contained" onClick={() => router.back()}>
        {t('common.done', 'Done')}
      </Button>
    </div>
  );

  const getHeaderLabel = () => {
    switch (step) {
      case 'form': return t('kyc.header.personal', 'Personal Info');
      case 'upload-id': return t('kyc.header.documents', 'Upload ID');
      case 'upload-selfie': return t('kyc.header.selfie', 'Take Selfie');
      case 'success': return t('kyc.header.success', 'Verified');
      default: return t('kyc.header.title', 'Identity Verification');
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <Header 
        label={getHeaderLabel()} 
        onBack={step === 'overview' || step === 'success' ? undefined : () => {
          if (step === 'form') setStep('overview');
          else if (step === 'upload-id') setStep('form');
          else if (step === 'upload-selfie') setStep('upload-id');
        }} 
      />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {step === 'overview' && renderOverview()}
        {step === 'form' && renderForm()}
        {step === 'upload-id' && renderUploadId()}
        {step === 'upload-selfie' && renderUploadSelfie()}
        {step === 'success' && renderSuccess()}
      </div>
    </div>
  );
}
