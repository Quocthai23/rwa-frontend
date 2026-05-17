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
  X,
  User01,
  File02,
  AlertCircle
} from '@untitledui/icons';
import { 
  Sheet, 
  SheetContent,
  SheetClose
} from '@/components/shared/atoms/web/sheet';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useKyc } from '@/hook/useKyc';
import kycService from '@/services/kycService';
import { useToast } from '@/hook/useToast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type KycStep = 'overview' | 'form' | 'upload-id' | 'upload-selfie' | 'success';

interface KycFlowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KycFlowSheet({ open, onOpenChange }: KycFlowSheetProps) {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!open) {
      setTimeout(() => setStep('overview'), 300);
    }
  }, [open]);

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

  const renderHeader = (title: string, description?: string) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        {step !== 'overview' && step !== 'success' && (
          <button 
            onClick={() => {
              if (step === 'form') setStep('overview');
              else if (step === 'upload-id') setStep('form');
              else if (step === 'upload-selfie') setStep('upload-id');
            }} 
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );

  const renderOverview = () => {
    if (kycStatus?.status === 'APPROVED') {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.verified', 'Account Verified')}</h3>
          <p className="text-muted-foreground mt-3 max-w-xs">
            {t('kyc.status.verifiedDesc', 'Your identity has been successfully verified. You now have full access to all features.')}
          </p>
          <Button className="mt-10 w-full h-12 text-base font-semibold" variant="primary-contained" onClick={() => onOpenChange(false)}>
            {t('common.done', 'Done')}
          </Button>
        </div>
      );
    }

    if (kycStatus?.status === 'PENDING') {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-6">
            <Clock size={48} className="text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.pending', 'Verification Pending')}</h3>
          <p className="text-muted-foreground mt-3 max-w-xs">
            {t('kyc.status.pendingDesc', 'We are currently reviewing your documents. This process usually takes 24-48 hours.')}
          </p>
          <Button className="mt-10 w-full h-12 text-base font-semibold" variant="neutral-outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      );
    }

    if (kycStatus?.status === 'REJECTED') {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <XCircle size={48} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('kyc.status.rejected', 'Verification Rejected')}</h3>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mt-4 w-full">
            <p className="text-red-600 dark:text-red-400 font-medium text-sm">
              {t('kyc.status.reason', 'Reason')}: {kycStatus.rejectReason || t('kyc.status.defaultReason', 'Documents were unclear or invalid')}
            </p>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            {t('kyc.status.tryAgainDesc', 'Please ensure all information matches your ID and photos are clear.')}
          </p>
          <Button className="mt-8 w-full h-12 text-base font-semibold" variant="primary-contained" onClick={() => setStep('form')}>
            {t('kyc.tryAgain', 'Try Again')}
          </Button>
        </div>
      );
    }

    return (
      <div className="py-2">
        {renderHeader(t('kyc.title', 'Identity Verification'), t('kyc.desc', 'Complete verification to unlock higher limits and premium features.'))}
        
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="mt-1 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
              <User01 size={20} className="text-primary-500" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t('kyc.benefits.withdrawal', 'High Withdrawal Limits')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{t('kyc.benefits.withdrawalDesc', 'Withdraw up to $100,000 daily.')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="mt-1 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
              <File02 size={20} className="text-primary-500" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t('kyc.benefits.assets', 'Full Asset Access')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{t('kyc.benefits.assetsDesc', 'Trade all available RWA assets without restrictions.')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="mt-1 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
              <AlertCircle size={20} className="text-primary-500" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t('kyc.benefits.security', 'Enhanced Security')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{t('kyc.benefits.securityDesc', 'Add an extra layer of protection to your account.')}</p>
            </div>
          </div>
        </div>

        <Button className="w-full h-12 text-base font-semibold" variant="primary-contained" onClick={() => setStep('form')}>
          {t('kyc.start', 'Start Verification')}
        </Button>
      </div>
    );
  };

  const renderForm = () => (
    <div className="py-2">
      {renderHeader(t('kyc.step.personal', 'Personal Information'), t('kyc.step.personalDesc', 'Enter your legal information exactly as it appears on your ID.'))}
      
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('kyc.form.fullName', 'Full Legal Name')}</label>
          <Input 
            className="h-12 bg-muted/30"
            placeholder={t('kyc.form.fullNamePlaceholder', 'Enter your full name')}
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('kyc.form.dob', 'Date of Birth')}</label>
          <Input 
            className="h-12 bg-muted/30"
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('kyc.form.idNumber', 'ID / Passport Number')}</label>
          <Input 
            className="h-12 bg-muted/30"
            placeholder={t('kyc.form.idPlaceholder', 'Enter document number')}
            value={formData.idNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-10">
        <Button 
          className="w-full h-12 text-base font-semibold" 
          variant="primary-contained" 
          onClick={() => setStep('upload-id')}
          disabled={!formData.fullName || !formData.dob || !formData.idNumber}
        >
          {t('common.next', 'Next: Upload Documents')}
        </Button>
      </div>
    </div>
  );

  const renderUploadId = () => (
    <div className="py-2">
      {renderHeader(t('kyc.step.documents', 'Upload Documents'), t('kyc.step.documentsDesc', 'Clear photos help us verify your account faster.'))}
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground ml-1">{t('kyc.form.idFront', 'Front Side')}</label>
          <div 
            className={cn(
              "border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
              images.idFrontImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
            )}
            onClick={() => frontInputRef.current?.click()}
          >
            {images.idFrontImg ? (
              <Image src={images.idFrontImg} alt="ID Front" fill className="object-cover" />
            ) : (
              <>
                <div className="bg-primary-50 dark:bg-primary-900/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud02 size={24} className="text-primary-500" />
                </div>
                <span className="text-sm font-medium text-foreground">{t('kyc.upload.front', 'Upload Front Side')}</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
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
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground ml-1">{t('kyc.form.idBack', 'Back Side')}</label>
          <div 
            className={cn(
              "border-2 border-dashed rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
              images.idBackImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
            )}
            onClick={() => backInputRef.current?.click()}
          >
            {images.idBackImg ? (
              <Image src={images.idBackImg} alt="ID Back" fill className="object-cover" />
            ) : (
              <>
                <div className="bg-primary-50 dark:bg-primary-900/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud02 size={24} className="text-primary-500" />
                </div>
                <span className="text-sm font-medium text-foreground">{t('kyc.upload.back', 'Upload Back Side')}</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
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
      </div>
      
      <div className="mt-10">
        <Button 
          variant="primary-contained" 
          className="w-full h-12 text-base font-semibold" 
          onClick={() => setStep('upload-selfie')}
          disabled={!images.idFrontImg || !images.idBackImg || isUploading}
        >
          {isUploading ? t('common.uploading', 'Uploading...') : t('common.next', 'Next: Take Selfie')}
        </Button>
      </div>
    </div>
  );

  const renderUploadSelfie = () => (
    <div className="py-2">
      {renderHeader(t('kyc.step.selfie', 'Face Verification'), t('kyc.step.selfieDesc', 'Hold your ID next to your face and take a clear photo.'))}
      
      <div 
        className={cn(
          "border-2 border-dashed rounded-2xl h-72 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group",
          images.selfieImg ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
        )}
        onClick={() => selfieInputRef.current?.click()}
      >
        {images.selfieImg ? (
          <Image src={images.selfieImg} alt="Selfie" fill className="object-cover" />
        ) : (
          <>
            <div className="bg-primary-50 dark:bg-primary-900/10 p-5 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Camera01 size={40} className="text-primary-500" />
            </div>
            <span className="text-base font-bold text-foreground">{t('kyc.upload.takeSelfie', 'Take Selfie')}</span>
            <span className="text-sm text-muted-foreground mt-2 max-w-[200px] text-center">
              Ensure your face and ID are clearly visible in the frame.
            </span>
          </>
        )}
        <input 
          type="file" 
          ref={selfieInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'selfieImg')}
        />
      </div>
      
      <div className="mt-10">
        <Button 
          variant="primary-contained" 
          className="w-full h-12 text-base font-semibold" 
          onClick={handleFinish}
          disabled={!images.selfieImg || isUploading || isSubmitting}
        >
          {isSubmitting ? t('common.submitting', 'Submitting...') : t('kyc.finish', 'Finish Verification')}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle size={56} className="text-primary-500" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">{t('kyc.success.title', 'All Set!')}</h3>
      <p className="text-muted-foreground mt-4 max-w-xs text-base">
        {t('kyc.success.desc', 'Your documents have been submitted successfully. We will notify you as soon as the review is complete.')}
      </p>
      <Button className="mt-12 w-full h-12 text-base font-semibold" variant="primary-contained" onClick={() => onOpenChange(false)}>
        {t('common.done', 'Done')}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="center" 
        className="bg-card w-full max-w-[500px] overflow-hidden rounded-2xl border p-0 dark:bg-neutral-900"
      >
        <SheetClose className="text-muted-foreground absolute top-5 right-5 z-50 rounded-lg p-1.5 hover:bg-muted transition-colors">
          <X size={22} strokeWidth={2.5} />
        </SheetClose>

        {/* Grabber/Handle look */}
        <div className="bg-muted/60 mx-auto mt-3 h-1.5 w-12 rounded-full" />
        
        <div className="h-full overflow-y-auto no-scrollbar px-6 pt-4 pb-12">
          {step === 'overview' && renderOverview()}
          {step === 'form' && renderForm()}
          {step === 'upload-id' && renderUploadId()}
          {step === 'upload-selfie' && renderUploadSelfie()}
          {step === 'success' && renderSuccess()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
