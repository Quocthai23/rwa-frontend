'use client';

import { ChevronDown, Headphones01, Plus, X } from '@untitledui/icons';
import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { feedbackApi, FeedbackType } from '@/services/feedbackService';
import { imageApi } from '@/services/imageService';
import { useTheme } from '@/theme';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { Button } from '@/components/shared/atoms/button';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-m4v']; // cspell:disable-line
const MAX_MEDIA = 6;

type MediaItem = {
  id: string;
  file: File;
  previewUri: string;
  type: 'image' | 'video';
};

function FeedbackWebContent({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { showError, showSuccess } = useToast();
  const [businessType, setBusinessType] = useState<FeedbackType>(FeedbackType.API);
  const [feedbackText, setFeedbackText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLiveChatPress = useCallback(() => {
    window.open('https://example.com/live-chat', '_blank');
  }, []);

  const businessTypeOptions = [
    { label: t('feedback.types.api'), value: FeedbackType.API },
    { label: t('feedback.types.deposit'), value: FeedbackType.Deposit },
    { label: t('feedback.types.others'), value: FeedbackType.Others },
    { label: t('feedback.types.events'), value: FeedbackType.Events },
    { label: t('feedback.types.copyTrading'), value: FeedbackType.CopyTrading },
    { label: t('feedback.types.partnerHub'), value: FeedbackType.Partnership },
  ];

  const validateFile = (file: File) => {
    const { type, size } = file;
    if (type.startsWith('image/')) {
      if (!IMAGE_MIMES.includes(type))
        return { valid: false, error: t('feedback.errors.imageType') };
      if (size > MAX_IMAGE_BYTES) return { valid: false, error: t('feedback.errors.imageSize') };
      return { valid: true };
    }
    if (type.startsWith('video/')) {
      if (size > MAX_VIDEO_BYTES) return { valid: false, error: t('feedback.errors.videoSize') };
      return { valid: true };
    }
    return { valid: false, error: t('feedback.errors.unsupportedType') };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = MAX_MEDIA - media.length;
      const filesToProcess = files.slice(0, remainingSlots);
      const newMedia: MediaItem[] = [];

      filesToProcess.forEach((file) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          showError(
            t('feedback.invalidFileTitle'),
            validation.error ?? t('feedback.errors.unsupportedType'),
          );
          return;
        }
        newMedia.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUri: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
        });
      });

      setMedia((prev) => [...prev, ...newMedia]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUri);
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!feedbackText.trim()) {
      showError(t('feedback.missingFeedbackTitle'), t('feedback.enterFeedbackMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrls: string[] = [];

      if (media.length > 0) {
        const filesToUpload = media.map((m) => ({
          uri: m.file,
          fileName: m.file.name,
          type: m.file.type,
        }));
        uploadedImageUrls = await imageApi.uploadMultipleImagesToPresignedUrl(filesToUpload);
      }

      await feedbackApi.submitFeedback({
        type: businessType,
        feedback: feedbackText.trim(),
        images: uploadedImageUrls,
      });

      showSuccess(t('feedback.submitSuccessTitle'), t('feedback.submitSuccessMessage'));
      setFeedbackText('');
      media.forEach((item) => URL.revokeObjectURL(item.previewUri));
      setMedia([]);
      setBusinessType(FeedbackType.API);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Failed to submit feedback:', error);
      showError(
        t('feedback.submitFailedTitle'),
        localizeApiError(error, t, 'feedback.submitFailedMessage'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [businessType, feedbackText, media, showError, showSuccess, onSuccess, t]);

  const selectedLabel =
    businessTypeOptions.find((o) => o.value === businessType)?.label ?? t('feedback.businessType');

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Overlay to close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
      )}

      <div className="flex-1">
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-body-medium-semibold text-foreground block font-semibold">
              {t('feedback.businessType')}
            </label>
            <button onClick={handleLiveChatPress} className="hover:bg-muted rounded-full p-1">
              <Headphones01 color={colors.neutral900} size={20} />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((v) => !v)}
              className="relative w-full"
            >
              <div className="text-body-large-regular border-border bg-background text-foreground focus:border-primary-500 w-full rounded border px-4 py-3 pr-10 text-left focus:outline-none">
                {selectedLabel}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                <ChevronDown color={colors.neutral400} size={20} />
              </div>
            </button>

            {isDropdownOpen && (
              <div className="border-border bg-background absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border shadow-lg">
                {businessTypeOptions.map((option) => {
                  const isSelected = option.value === businessType;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setBusinessType(option.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`hover:bg-muted hover:text-primary-500 flex w-full items-center px-4 py-3 text-left transition-colors ${
                        isSelected ? 'text-primary-500' : 'text-foreground'
                      }`}
                    >
                      <span
                        className={`text-body-large-medium ${isSelected ? 'text-primary-500 hover:text-primary-500' : 'text-foreground'}`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-body-medium-semibold text-foreground mb-2 block font-semibold">
            {t('feedback.feedbackSuggestion')}
          </label>
          <textarea
            className="text-body-large-regular border-border bg-background text-foreground focus:border-primary-500 placeholder-muted-foreground h-32 w-full resize-none rounded border p-4 focus:outline-none"
            placeholder={t('feedback.feedbackPlaceholder')}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex flex-row items-center justify-between">
            <span className="text-body-large-semibold text-foreground font-semibold">
              {t('feedback.imageVideo')}
            </span>
            <span className="text-body-large-regular text-muted-foreground">
              {media.length}/{MAX_MEDIA}
            </span>
          </div>

          <div className="border-border flex min-h-25 flex-row flex-wrap gap-3 rounded border p-3">
            {media.map((item) => (
              <div key={item.id} className="bg-card relative h-20 w-20 overflow-hidden rounded">
                {item.type === 'image' ? (
                  <Image
                    src={item.previewUri}
                    alt={t('feedback.previewAlt')}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="bg-muted flex h-full w-full items-center justify-center">
                    <span className="text-body-large-regular text-muted-foreground">
                      {t('feedback.video')}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleRemoveMedia(item.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 hover:bg-black/70"
                >
                  <X color="white" size={14} />
                </button>
              </div>
            ))}

            {media.length < MAX_MEDIA && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-card hover:bg-muted flex h-20 w-20 items-center justify-center rounded transition-colors"
              >
                <Plus color={colors.neutral500} size={24} />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept={[...IMAGE_MIMES, ...VIDEO_MIMES].join(',')}
              onChange={handleFileChange}
            />
          </div>
          <p className="text-body-small-regular text-muted-foreground mt-2">
            {t('feedback.maxUploadHint')}
          </p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-body-small-regular text-muted-foreground leading-relaxed">
            {t('feedback.urgentIssuePrefix')}{' '}
            <span
              onClick={handleLiveChatPress}
              className="text-primary-500 cursor-pointer font-semibold hover:underline"
            >
              {t('feedback.liveChat')}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <Button
          disabled={isSubmitting}
          onClick={handleSubmit}
          className={`flex w-full items-center justify-center rounded py-3.5 font-semibold text-white transition-colors ${
            isSubmitting ? 'bg-muted cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
          }`}
        >
          {isSubmitting ? t('feedback.submitting') : t('feedback.submit')}
        </Button>
      </div>
    </div>
  );
}

export default memo(FeedbackWebContent);
