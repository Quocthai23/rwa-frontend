'use client';

import { X } from '@untitledui/icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/atoms/dialog';
import { useContractTemplate } from '@/hook/useAssetManagement';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/atoms/select';

type ContractTemplateSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  assetId?: string;
  userAddress?: string;
  assetName?: string;
  onApply: (title: string, description: string) => void;
};

export default function ContractTemplateSheet({ isOpen, onOpenChange, type, assetId, userAddress, assetName, onApply }: ContractTemplateSheetProps) {
  const { t } = useTranslation();
  const [currentType, setCurrentType] = useState(type);
  const { data: templateData, isLoading } = useContractTemplate(currentType, isOpen);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentType(type);
      setFormData({});
    }
  }, [isOpen, type]);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getFinalContent = () => {
    if (!templateData?.content) return '';
    let finalContent = templateData.content;
    finalContent = finalContent.replace(/\[\[userAddress\]\]/g, userAddress || 'Không xác định');
    finalContent = finalContent.replace(/\[\[assetName\]\]/g, assetName || 'Tài Sản');
    const matches = finalContent.match(/\{\{([^}]+)\}\}/g) || [];
    matches.forEach((match: string) => {
      const key = match.replace(/[{}]/g, '');
      finalContent = finalContent.replace(match, formData[key] || `[${key}]`);
    });
    return finalContent;
  };

  const handleApply = () => {
    if (!templateData) return;
    onApply(templateData.title, getFinalContent());
    onOpenChange(false);
  };

  const handleESign = async () => {
    setIsSigning(true);
    try {
      // 1. Get the DOM element for the contract content
      const element = document.getElementById('contract-content-to-print');
      if (!element) throw new Error('Contract content not found');

      // 2. Load html2pdf dynamically
      const html2pdf = (await import('html2pdf.js')).default;
      const opt: any = {
        margin:       10,
        filename:     `HopDong-${currentType}-${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 3. Generate PDF Blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

      // 4. Hash the PDF Blob
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 5. Send Hash to Backend to anchor on Blockchain
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/asset-management/${assetId}/legal/anchor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentHash: hashHex, type: currentType }),
      });

      if (!response.ok) {
        throw new Error('Failed to anchor document on blockchain');
      }
      
      const responseData = await response.json();
      
      // 6. Download the PDF for the user
      html2pdf().set(opt).from(element).save();
      
      alert(`Ký số thành công! Mã giao dịch (TxHash): ${responseData.txHash}`);
      onOpenChange(false);
    } catch (error: any) {
      alert(`Lỗi ký số: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  // Extract placeholders to render input fields
  const renderInteractiveContent = (content: string) => {
    // Replace system variables first for display, and normalize Unicode to NFC to fix detached Vietnamese diacritics
    let displayContent = content.normalize('NFC');
    displayContent = displayContent.replace(/\[\[userAddress\]\]/g, userAddress || 'Không xác định');
    displayContent = displayContent.replace(/\[\[assetName\]\]/g, assetName || 'Tài Sản');

    const parts = displayContent.split(/(\{\{[^}]+\}\})/g);

    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.replace(/[{}]/g, '');
        return (
          <input
            key={index}
            type="text"
            placeholder={key}
            value={formData[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="inline-block border-b-2 border-primary/50 bg-primary/5 text-primary-700 dark:text-primary-400 focus:border-primary outline-none px-2 py-0.5 min-w-[150px] mx-1 font-medium transition-colors"
          />
        );
      }

      // Handle [CENTER] tags
      const centerParts = part.split(/(\[CENTER\][\s\S]*?\[\/CENTER\])/g);
      return (
        <span key={index}>
          {centerParts.map((cp, k) => {
            if (cp.startsWith('[CENTER]') && cp.endsWith('[/CENTER]')) {
              const content = cp.replace(/\[\/?CENTER\]/g, '');
              const boldParts = content.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={k} className="text-center w-full my-2">
                  {boldParts.map((bp, i) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) {
                      return <strong key={i} className="font-bold text-foreground">{bp.replace(/\*\*/g, '')}</strong>;
                    }
                    return bp.split('\n').map((line, j) => (
                      <span key={`${i}-${j}`}>
                        {line}
                        {j < bp.split('\n').length - 1 && <br />}
                      </span>
                    ));
                  })}
                </div>
              );
            }

            // Normal parsing for non-centered
            const boldParts = cp.split(/(\*\*[^*]+\*\*)/g);
            return (
              <span key={k}>
                {boldParts.map((bp, i) => {
                  if (bp.startsWith('**') && bp.endsWith('**')) {
                    return <strong key={i} className="font-bold text-foreground">{bp.replace(/\*\*/g, '')}</strong>;
                  }
                  return bp.split('\n').map((line, j) => (
                    <span key={`${i}-${j}`}>
                      {line}
                      {j < bp.split('\n').length - 1 && <br />}
                    </span>
                  ));
                })}
              </span>
            );
          })}
        </span>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-8xl bg-card border-border p-0 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" showCloseButton={true}>
        <div className="p-6 border-b border-border/50 bg-muted/10">
          <DialogHeader className="p-0 text-left">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-h3-semibold tracking-tight">Hợp Đồng Khung (Template)</DialogTitle>
                <p className="text-body-small-regular text-muted-foreground mt-1">
                  Vui lòng điền các thông tin còn thiếu vào các ô trống trực tiếp trên văn bản dưới đây.
                </p>
              </div>
              <div className="w-64 shrink-0">
                <Select value={currentType} onValueChange={setCurrentType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Chọn loại hợp đồng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Đề xuất Quản trị (General)</SelectItem>
                    <SelectItem value="MAINTENANCE">Đề xuất Bảo trì (Maintenance)</SelectItem>
                    <SelectItem value="BUYOUT_PROPOSAL">Mua đứt Tài sản (Buyout)</SelectItem>
                    <SelectItem value="LEASE">Cho Thuê Tài Sản (Lease)</SelectItem>
                    <SelectItem value="WITHDRAW">Rút Tiền Quỹ (Treasury)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-900/50">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-32 w-full mt-8" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : templateData?.content ? (
            <div id="contract-content-to-print" className="bg-white dark:bg-zinc-950 border border-border/50 rounded-lg shadow-sm p-8 md:p-16 prose prose-sm dark:prose-invert max-w-none text-body-medium-regular leading-loose text-zinc-800 dark:text-zinc-200">
              {renderInteractiveContent(templateData.content)}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-12">Không tìm thấy mẫu hợp đồng.</div>
          )}
        </div>

        <div className="p-6 border-t border-border/50 bg-card mt-auto flex justify-end gap-3">
          <Button variant="neutral-outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button onClick={handleApply} disabled={isLoading || !templateData?.content} variant="neutral-outline" className="px-8 shadow-sm">
            Tạo Đề Xuất
          </Button>
          <Button onClick={handleESign} disabled={isSigning || isLoading || !templateData?.content} variant="primary-contained" className="px-8 shadow-sm">
            {isSigning ? 'Đang Ký...' : 'Ký & Lưu Hợp Đồng'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

