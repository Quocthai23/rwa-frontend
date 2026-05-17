'use client';

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  UploadCloud02, 
  CheckCircle, 
  X,
  File02,
  Image01,
  Bank,
  Coins02,
  Plus,
  Trash01
} from '@untitledui/icons';
import { 
  Sheet, 
  SheetContent,
  SheetClose
} from '@/components/shared/atoms/web/sheet';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useAssetCategories } from '@/hook/useAssets';
import assetDeploymentService from '@/services/assetDeploymentService';
import { useToast } from '@/hook/useToast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type DeploymentStep = 'basic' | 'real-estate' | 'financial' | 'legal' | 'success';

interface AssetDeploymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDeploymentSheet({ open, onOpenChange }: AssetDeploymentSheetProps) {
  const { t } = useTranslation();
  const { data: categories } = useAssetCategories();
  const { showError, showSuccess } = useToast();
  
  const [step, setStep] = useState<DeploymentStep>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    description: '',
    logo: '',
    categoryId: '',
    totalSupply: 0,
    tokenPrice: 0,
    expectedApy: 0,
    location: '',
    area: 0,
    zoning: '',
    businessModel: '',
    monthlyBenefits: '',
    titleDeedImage: '',
  });
  
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  
  const [legalDocs, setLegalDocs] = useState<{ url: string; name: string }[]>([]);
  const [ownerNote, setOwnerNote] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const titleDeedInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await assetDeploymentService.uploadDocument(file);
      setFormData(prev => ({ ...prev, logo: url }));
      showSuccess(t('common.success'), t('assetDeployment.logoUploadSuccess', 'Logo uploaded successfully'));
    } catch (error) {
      showError(t('common.error'), t('assetDeployment.uploadFailed', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await assetDeploymentService.uploadDocument(file);
      setLegalDocs(prev => [...prev, { url, name: file.name }]);
      showSuccess(t('common.success'), t('assetDeployment.docUploadSuccess', 'Document uploaded successfully'));
    } catch (error) {
      showError(t('common.error'), t('assetDeployment.uploadFailed', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleImagesUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await assetDeploymentService.uploadDocument(file);
      setImages(prev => [...prev, { url, name: file.name }]);
      showSuccess(t('common.success'), t('assetDeployment.imageUploadSuccess', 'Image uploaded successfully'));
    } catch (error) {
      showError(t('common.error'), t('assetDeployment.uploadFailed', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleTitleDeedUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await assetDeploymentService.uploadDocument(file);
      setFormData(prev => ({ ...prev, titleDeedImage: url }));
      showSuccess(t('common.success'), 'Title deed image uploaded successfully');
    } catch (error) {
      showError(t('common.error'), t('assetDeployment.uploadFailed', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAsset = async () => {
    setIsSubmitting(true);
    try {
      const result = await assetDeploymentService.createAsset({
        ...formData,
        totalSupply: Number(formData.totalSupply),
        tokenPrice: Number(formData.tokenPrice),
        expectedApy: formData.expectedApy ? Number(formData.expectedApy) : undefined,
        area: formData.area ? Number(formData.area) : undefined,
        images: images.map(img => img.url),
      });
      
      const assetId = result.data.id;
      
      // Immediately submit onboarding
      await assetDeploymentService.submitOnboarding(assetId, {
        legalDocumentUrls: legalDocs.map(d => d.url),
        ownerNote
      });
      
      setStep('success');
    } catch (error) {
      showError(t('common.error'), t('assetDeployment.createFailed', 'Failed to create asset deployment request.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = (title: string, description?: string) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        {step !== 'basic' && step !== 'success' && (
          <button 
            onClick={() => {
              if (step === 'real-estate') setStep('basic');
              else if (step === 'financial') setStep('real-estate');
              else if (step === 'legal') setStep('financial');
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

  const renderBasicInfo = () => (
    <div className="py-2 animate-in fade-in slide-in-from-right-4 duration-300">
      {renderHeader(t('assetDeployment.step.basic', 'Basic Information'), t('assetDeployment.step.basicDesc', 'Set up the core identity of your Real World Asset.'))}
      
      <div className="space-y-5">
        <div className="flex justify-center mb-6">
          <div 
            className={cn(
              "w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all",
              formData.logo ? "border-primary-500" : "border-border hover:border-primary-400 hover:bg-muted/50"
            )}
            onClick={() => logoInputRef.current?.click()}
          >
            {formData.logo ? (
              <Image src={formData.logo} alt="Asset Logo" fill className="object-cover" />
            ) : (
              <>
                <Image01 size={24} className="text-muted-foreground mb-1 group-hover:text-primary-500 transition-colors" />
                <span className="text-[10px] font-medium text-muted-foreground">LOGO</span>
              </>
            )}
            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.symbol', 'Token Symbol')}</label>
            <Input 
              className="h-12 bg-muted/30 uppercase"
              placeholder="E.g. RWA-EST-01"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.category', 'Category')}</label>
            <select 
              className="flex h-12 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.name', 'Asset Name')}</label>
          <Input 
            className="h-12 bg-muted/30"
            placeholder="E.g. Vinhome Landmark 81 Apartment"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.description', 'Description')}</label>
          <textarea 
            className="flex min-h-[100px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Provide detailed information about the underlying asset..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-8">
        <Button 
          className="w-full h-12 text-base font-semibold" 
          variant="primary-contained" 
          onClick={() => setStep('real-estate')}
          disabled={!formData.symbol || !formData.name || !formData.categoryId}
        >
          {t('common.next', 'Next: Asset Details')}
        </Button>
      </div>
    </div>
  );

  const imageInputRef = useRef<HTMLInputElement>(null);

  const renderRealEstateInfo = () => (
    <div className="py-2 animate-in fade-in slide-in-from-right-4 duration-300">
      {renderHeader('Asset Details', 'Provide physical and business information.')}
      
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Address / Location</label>
          <Input 
            className="h-12 bg-muted/30"
            placeholder="Asset location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Area (sqm)</label>
          <Input 
            type="number"
            className="h-12 bg-muted/30"
            placeholder="100"
            value={formData.area || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, area: Number(e.target.value) }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Zoning / Planning (Quy hoạch)</label>
          <Input 
            className="h-12 bg-muted/30"
            placeholder="Residential, Commercial..."
            value={formData.zoning}
            onChange={(e) => setFormData(prev => ({ ...prev, zoning: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Business Model (Kinh doanh)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
            placeholder="E.g. Rental, Hospitality..."
            value={formData.businessModel}
            onChange={(e) => setFormData(prev => ({ ...prev, businessModel: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">Monthly Benefits (Lợi ích hàng tháng)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
            placeholder="E.g. $5000/month rental income..."
            value={formData.monthlyBenefits}
            onChange={(e) => setFormData(prev => ({ ...prev, monthlyBenefits: e.target.value }))}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground ml-1">Title Deed Image (Sổ đỏ - Optional)</label>
          {formData.titleDeedImage ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border group">
              <Image src={formData.titleDeedImage} alt="Title Deed" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => setFormData(prev => ({ ...prev, titleDeedImage: '' }))} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                  <Trash01 size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-muted/50 transition-all group"
              onClick={() => titleDeedInputRef.current?.click()}
            >
              <div className="bg-primary-50 dark:bg-primary-900/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Image01 size={24} className="text-primary-500" />
              </div>
              <span className="text-sm font-medium text-foreground">Upload Title Deed / Sổ Đỏ</span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB</span>
              <input type="file" ref={titleDeedInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleTitleDeedUpload(e.target.files[0])} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground ml-1">Asset Images</label>
          <div className="space-y-2">
            {images.map((img, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-sm truncate">{img.name}</span>
                <button onClick={() => setImages(prev => prev.filter((_, i) => i !== index))} className="p-1 text-muted-foreground hover:text-red-500">
                  <Trash01 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div 
            className="border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-primary-400"
            onClick={() => imageInputRef.current?.click()}
          >
            <Plus size={20} className="mr-2" /> Add Image
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImagesUpload(e.target.files[0])} />
          </div>
        </div>

      </div>

      <div className="mt-8">
        <Button 
          className="w-full h-12 text-base font-semibold" 
          variant="primary-contained" 
          onClick={() => setStep('financial')}
        >
          Next: Financial Details
        </Button>
      </div>
    </div>
  );

  const renderFinancialInfo = () => (
    <div className="py-2 animate-in fade-in slide-in-from-right-4 duration-300">
      {renderHeader(t('assetDeployment.step.financial', 'Financial Details'), t('assetDeployment.step.financialDesc', 'Define the tokenomics and expected returns.'))}
      
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 mb-6">
          <div className="flex items-center gap-3 mb-2 text-primary-600 dark:text-primary-400">
            <Coins02 size={20} />
            <h4 className="font-semibold">{t('assetDeployment.valuation', 'Estimated Valuation')}</h4>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${(formData.totalSupply * formData.tokenPrice).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('assetDeployment.valuationDesc', 'Based on total supply and token price.')}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.totalSupply', 'Total Supply (Tokens)')}</label>
          <Input 
            type="number"
            className="h-12 bg-muted/30"
            placeholder="10000"
            value={formData.totalSupply || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: Number(e.target.value) }))}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.tokenPrice', 'Price Per Token (USDT)')}</label>
          <Input 
            type="number"
            className="h-12 bg-muted/30"
            placeholder="50"
            value={formData.tokenPrice || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, tokenPrice: Number(e.target.value) }))}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.apy', 'Expected APY (%)')}</label>
          <Input 
            type="number"
            className="h-12 bg-muted/30"
            placeholder="8.5"
            value={formData.expectedApy || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, expectedApy: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="mt-10">
        <Button 
          className="w-full h-12 text-base font-semibold" 
          variant="primary-contained" 
          onClick={() => setStep('legal')}
          disabled={formData.totalSupply <= 0 || formData.tokenPrice <= 0}
        >
          {t('common.next', 'Next: Legal Documents')}
        </Button>
      </div>
    </div>
  );

  const renderLegalInfo = () => (
    <div className="py-2 animate-in fade-in slide-in-from-right-4 duration-300">
      {renderHeader(t('assetDeployment.step.legal', 'Legal Onboarding'), t('assetDeployment.step.legalDesc', 'Submit legal dossier for due diligence review.'))}
      
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground ml-1">{t('assetDeployment.form.documents', 'Legal Documents')}</label>
          
          <div className="space-y-2">
            {legalDocs.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="shrink-0 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
                    <File02 size={18} className="text-primary-500" />
                  </div>
                  <span className="text-sm font-medium truncate">{doc.name}</span>
                </div>
                <button 
                  onClick={() => setLegalDocs(prev => prev.filter((_, i) => i !== index))}
                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash01 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div 
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-muted/50 transition-all group"
            onClick={() => docInputRef.current?.click()}
          >
            <div className="bg-primary-50 dark:bg-primary-900/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-primary-500" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('assetDeployment.uploadDoc', 'Add Legal Document')}</span>
            <span className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG up to 20MB</span>
            <input type="file" ref={docInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0])} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground ml-1">{t('assetDeployment.form.note', 'Owner Note (Optional)')}</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Any additional information for the auditors..."
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
          />
        </div>

        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-3">
          <Bank size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            By submitting, you agree that these documents are legally binding and will be used for due diligence and custody verification.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Button 
          variant="primary-contained" 
          className="w-full h-12 text-base font-semibold" 
          onClick={handleCreateAsset}
          disabled={legalDocs.length === 0 || isSubmitting || isUploading}
        >
          {isSubmitting ? t('common.submitting', 'Submitting Deployment...') : t('assetDeployment.submit', 'Submit Deployment Request')}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-500">
      <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-8">
        <CheckCircle size={64} className="text-primary-500" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">{t('assetDeployment.success.title', 'Deployment Submitted!')}</h3>
      <p className="text-muted-foreground mt-4 max-w-xs text-base">
        Your asset <strong>{formData.name}</strong> has been queued for review. You can monitor the status in your Asset Manager dashboard.
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
        className="bg-card w-full max-w-[540px] overflow-hidden rounded-2xl border p-0 dark:bg-neutral-900"
      >
        <SheetClose className="text-muted-foreground absolute top-5 right-5 z-50 rounded-lg p-1.5 hover:bg-muted transition-colors">
          <X size={22} strokeWidth={2.5} />
        </SheetClose>

        <div className="bg-muted/60 mx-auto mt-3 h-1.5 w-12 rounded-full" />
        
        <div className="h-full overflow-y-auto no-scrollbar px-8 pt-4 pb-12">
          {step === 'basic' && renderBasicInfo()}
          {step === 'real-estate' && renderRealEstateInfo()}
          {step === 'financial' && renderFinancialInfo()}
          {step === 'legal' && renderLegalInfo()}
          {step === 'success' && renderSuccess()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
