'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/shared/atoms/sheet';
import { DotsHorizontal, DotsVertical, Edit02, Trash01, XClose } from '@untitledui/icons';

type PostOwnerDropdownProps = {
  disabled?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

export function PostOwnerDropdown({
  disabled,
  isDeleting,
  onDelete,
  onEdit,
}: PostOwnerDropdownProps) {
  const { t } = useTranslation();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleConfirmDelete = () => {
    onDelete?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="neutral-ghost"
            className="bg-transparent dark:bg-transparent"
            disabled={disabled || isDeleting}
            aria-label={t('discover.web.openPostActions', 'Open post actions')}
          >
            <DotsHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="bg-background w-60 rounded border-none p-3 shadow-md"
        >
          <DropdownMenuItem
            className="hover:bg-muted cursor-pointer gap-3 rounded"
            onClick={onEdit}
          >
            <Edit02 className="text-foreground size-4" />
            <span className="text-body-large-regular text-foreground">
              {t('discover.web.edit', 'Edit')}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="hover:bg-muted cursor-pointer gap-3 rounded"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isDeleting}
          >
            <Trash01 className="size-4 text-red-500" />
            <span className="text-body-large-regular text-red-500">
              {isDeleting
                ? t('discover.web.deleting', 'Deleting...')
                : t('discover.web.delete', 'Delete')}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto w-full max-w-3xl rounded-t-2xl border-none p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">
            {t('discover.web.deletePostConfirmationTitle', 'Delete post confirmation')}
          </SheetTitle>

          <div className="px-6 py-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <p className="text-foreground text-h3-semibold">
                {t('discover.web.deletePostTitle', 'Delete post?')}
              </p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                <XClose className="size-5" />
              </button>
            </div>

            <p className="text-foreground text-body-small-regular">
              {t(
                'discover.web.deletePostMessage',
                "This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results.",
              )}
            </p>

            <div className="mt-6 space-y-2">
              <Button
                type="button"
                variant="red-contained"
                className="text-body-small-medium w-full py-2 text-white"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? t('discover.web.deleting', 'Deleting...')
                  : t('discover.web.delete', 'Delete')}
              </Button>
              <Button
                type="button"
                variant="white-outline"
                className="text-body-small-medium text-foreground w-full py-2"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                {t('discover.web.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
