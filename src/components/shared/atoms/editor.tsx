'use client';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { cn } from '@/lib/utils';

export type EditorHandle = {
  focus: () => void;
  insertTextAtCursor: (text: string) => void;
  moveCaretToEnd: () => void;
};

type EditorProps = {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

function CaptureEditorPlugin({ onCapture }: { onCapture: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onCapture(editor);
  }, [editor, onCapture]);

  return null;
}

function SyncExternalValuePlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      const currentValue = root.getTextContent();

      if (currentValue === value) {
        return;
      }

      root.clear();
      const lines = value.split('\n');
      if (lines.length === 0) {
        root.append($createParagraphNode());
        return;
      }

      lines.forEach((line) => {
        const paragraph = $createParagraphNode();
        if (line) {
          paragraph.append($createTextNode(line));
        }
        root.append(paragraph);
      });
    });
  }, [editor, value]);

  return null;
}

const URL_MATCHER = createLinkMatcherWithRegExp(/https?:\/\/[^\s/$.?#].[^\s]*/i, (text) => text);

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, onChange, placeholder, className },
  forwardedRef,
) {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);

  const initialConfig = useMemo(
    () => ({
      namespace: 'shared-inline-editor',
      theme: {
        link: 'text-primary-500 hover:text-primary-600 underline underline-offset-2 transition-colors',
      },
      nodes: [LinkNode, AutoLinkNode],
      onError: (error: Error) => {
        throw error;
      },
      editable: true,
    }),
    [],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus: () => {
        editor?.focus();
      },
      insertTextAtCursor: (text: string) => {
        if (!editor || !text) {
          return;
        }

        editor.update(() => {
          let selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            $getRoot().selectEnd();
            selection = $getSelection();
          }

          if ($isRangeSelection(selection)) {
            selection.insertText(text);
          }
        });

        editor.focus();
      },
      moveCaretToEnd: () => {
        if (!editor) {
          return;
        }

        editor.update(() => {
          $getRoot().selectEnd();
        });
        editor.focus();
      },
    }),
    [editor],
  );

  const handleCaptureEditor = useCallback((nextEditor: LexicalEditor) => {
    setEditor(nextEditor);
  }, []);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <CaptureEditorPlugin onCapture={handleCaptureEditor} />
      <SyncExternalValuePlugin value={value} />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                'caret-primary-500 break-words whitespace-pre-wrap focus:outline-none',
                className,
              )}
              placeholder={<></>}
              aria-placeholder={placeholder ?? ''}
            />
          }
          placeholder={
            <div className="text-muted-foreground pointer-events-none absolute top-0 left-0">
              {placeholder}
            </div>
          }
          ErrorBoundary={({ children }) => children}
        />
      </div>
      <LinkPlugin />
      <AutoLinkPlugin matchers={[URL_MATCHER]} />
      <HistoryPlugin />
      <OnChangePlugin
        onChange={(editorState) => {
          editorState.read(() => {
            onChange($getRoot().getTextContent());
          });
        }}
      />
    </LexicalComposer>
  );
});
