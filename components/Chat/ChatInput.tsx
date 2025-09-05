import {
  IconArrowDown,
  IconBolt,
  IconPlayerStop,
  IconRepeat,
  IconSend,
  IconFileText,
  IconPhoto,
} from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';
import toast from 'react-hot-toast';

import { Message } from '@/types/chat';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';
import { FileUpload } from '@/components/FileUpload/FileUpload';
// Image upload is always visible; no model capability gating

interface Props {
  onSend: (message: Message, imagesBase64?: string[]) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, messageIsStreaming, prompts },

    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const promptListRef = useRef<HTMLUListElement | null>(null);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    setContent(value);
    updatePromptListVisibility(value);
  };


  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({ role: 'user', content });
    setContent('');

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const toggleFileUpload = () => {
    setShowFileUpload((v) => !v);
  };

  const toggleImageUpload = () => {
    setShowImageUpload((v) => !v);
  };

  const handleFileSelect = async (file: File) => {
    const maxSize = 50 * 1024 * 1024;
    const name = file.name.toLowerCase();
    if (file.size > maxSize) {
      toast.error(`File must be <= ${maxSize / (1024 * 1024)}MB`);
      return;
    }
    setSelectedFile(file);
    setIsProcessingFile(true);
    try {
      let text = '';
      let pages: number | undefined = undefined;
      let kind: 'pdf' | 'text' | 'markdown' | 'other' = 'other';
      if (file.type.includes('pdf') || name.endsWith('.pdf')) {
        // parse on server for PDFs
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/pdf',
            'x-file-name': encodeURIComponent(file.name),
          },
          body: file,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.message || 'Failed to parse PDF');
          return;
        }
        const data = (await res.json()) as { text: string; pages: number; info: any };
        text = data.text || '';
        pages = data.pages;
        kind = 'pdf';
      } else if (file.type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
        text = await file.text();
        kind = name.endsWith('.md') || name.endsWith('.markdown') ? 'markdown' : 'text';
      } else {
        // try reading as text; if not valid, fallback error
        try {
          text = await file.text();
          kind = 'text';
        } catch {
          toast.error('Unsupported file type');
          return;
        }
      }

      const MAX_TEXT_LENGTH = 50000;
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[Content truncated due to length]';
      }
      const preview = text.slice(0, 300);

      // Create a minimal user message and store full content in metadata
      onSend({
        role: 'user',
        content: `I've uploaded a document (${file.name}). Please analyze its content.`,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          metadata: {
            pages,
            kind,
            contentText: text,
            preview,
          },
        },
      });
      toast.success(t('Document attached') || 'Document attached');
      setShowFileUpload(false);
      setSelectedFile(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to attach document');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      // Clear input
      e.preventDefault();
      setContent('');
    } else if (e.key === 'Escape') {
      // Blur input
      e.preventDefault();
      if (textareaRef && textareaRef.current) {
        textareaRef.current.blur();
      }
    } else if (e.key === 'ArrowUp' && !content && !messageIsStreaming) {
      // Recall last user message into composer
      const lastUser = selectedConversation?.messages
        .slice()
        .reverse()
        .find((m) => m.role === 'user');
      if (lastUser) {
        setContent(lastUser.content);
        setTimeout(() => {
          if (textareaRef && textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
          }
        }, 0);
      }
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [content, textareaRef]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white/90 to-white/90 pt-3 dark:border-white/20 dark:via-[#0e1728]/90 dark:to-[#0e1728]/90 md:pt-2 backdrop-blur-sm">
      <div className="stretch mx-2 mt-4 flex flex-row gap-3 last:mb-2 md:mx-4 md:mt-[52px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
        {messageIsStreaming && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-xl bg-white dark:bg-gray-800 py-3 px-6 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-card hover:shadow-hover border border-gray-200 dark:border-gray-700 backdrop-blur-sm animate-fade-in md:mb-0 md:mt-2"
          >
            <IconPlayerStop size={16} stroke={2} /> {t('Stop Generating')}
          </button>
        )}

        {!messageIsStreaming &&
          selectedConversation &&
          selectedConversation.messages.length > 0 && (
            <button
              className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-xl bg-white dark:bg-gray-800 py-3 px-6 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-card hover:shadow-hover border border-gray-200 dark:border-gray-700 backdrop-blur-sm animate-fade-in md:mb-0 md:mt-2"
              onClick={onRegenerate}
            >
              <IconRepeat size={16} stroke={2} /> {t('Regenerate response')}
            </button>
          )}

        <div className="relative mx-2 flex w-full flex-grow flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-card hover:shadow-hover transition-all duration-200 sm:mx-4 backdrop-blur-sm">
          <div
            className="absolute left-3 top-3 rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 transition-all duration-200"
          >
            <IconBolt size={18} stroke={1.5} />
          </div>
          <textarea
            ref={textareaRef}
            className="m-0 w-full resize-none border-0 bg-transparent p-0 py-3 pr-10 pl-12 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-transparent transition-all duration-200 md:py-4 md:pl-14 md:pr-12"
            style={{
              resize: 'none',
              bottom: `${textareaRef?.current?.scrollHeight}px`,
              maxHeight: '400px',
              overflow: `${
                textareaRef.current && textareaRef.current.scrollHeight > 400
                  ? 'auto'
                  : 'hidden'
              }`,
            }}
            placeholder={
              t('Type a message or type "/" to select a prompt...') || ''
            }
            value={content}
            rows={1}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />

          <button
            className="absolute right-3 top-3 rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            onClick={handleSend}
            disabled={!!isProcessingFile}
          >
            {messageIsStreaming ? (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-gray-600 dark:border-gray-300"></div>
            ) : (
              <IconSend size={18} stroke={1.5} className="group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>

          <button
            className="absolute right-12 top-3 rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            onClick={toggleImageUpload}
            title={t('Attach Image') || 'Attach Image'}
            disabled={!!isProcessingFile}
          >
            <IconPhoto size={18} stroke={1.5} className="group-hover:scale-110 transition-transform duration-200" />
          </button>

          <button
            className="absolute right-24 top-3 rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            onClick={toggleFileUpload}
            title={t('Attach Document') || 'Attach Document'}
            disabled={!!isProcessingFile}
          >
            {isProcessingFile ? (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-gray-600 dark:border-gray-300"></div>
            ) : (
              <IconFileText size={18} stroke={1.5} className="group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>

          {showScrollDownButton && (
            <div className="absolute bottom-12 right-0 lg:bottom-0 lg:-right-10">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-card hover:shadow-hover border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 hover:scale-110 group"
                onClick={onScrollDownClick}
              >
                <IconArrowDown size={18} stroke={1.5} className="group-hover:translate-y-0.5 transition-transform duration-200" />
              </button>
            </div>
          )}

          {showPromptList && filteredPrompts.length > 0 && (
            <div className="absolute bottom-12 w-full">
              <PromptList
                activePromptIndex={activePromptIndex}
                prompts={filteredPrompts}
                onSelect={handleInitModal}
                onMouseOver={setActivePromptIndex}
                promptListRef={promptListRef}
              />
            </div>
          )}

          {showFileUpload && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[min(92vw,720px)] px-3 z-40">
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={() => setSelectedFile(null)}
                selectedFile={selectedFile || undefined}
                accept={'.pdf,.txt,.md,.markdown'}
                maxSize={50 * 1024 * 1024}
                validateFile={(f) => {
                  const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
                  const n = f.name.toLowerCase();
                  if (allowed.includes(f.type) || n.endsWith('.pdf') || n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.markdown')) return null;
                  return 'Unsupported file type (allowed: pdf, txt, md)';
                }}
              />
            </div>
          )}

          {showImageUpload && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[min(92vw,720px)] px-3 z-40">
              <FileUpload
                onFileSelect={async (file) => {
                  // basic image validation
                  if (!file.type.startsWith('image/')) {
                    toast.error('Please select an image file');
                    return;
                  }
                  const max = 10 * 1024 * 1024;
                  if (file.size > max) {
                    toast.error(`Image must be <= ${max / (1024 * 1024)}MB`);
                    return;
                  }
                  // convert and send immediately
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1] || result;
                    const text = content && content.trim().length > 0 ? content : (t('Describe the image') || 'Describe the image');
                    onSend({ role: 'user', content: text }, [base64]);
                    setContent('');
                    toast.success(t('Image attached') || 'Image attached');
                    setShowImageUpload(false);
                  };
                  reader.onerror = () => toast.error('Failed to attach image');
                  reader.readAsDataURL(file);
                }}
                onFileRemove={() => setSelectedImage(null)}
                selectedFile={selectedImage || undefined}
                accept={'image/*'}
                maxSize={10 * 1024 * 1024}
              />
            </div>
          )}

          {isModalVisible && (
            <VariableModal
              prompt={filteredPrompts[activePromptIndex]}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => setIsModalVisible(false)}
            />
          )}

          
        </div>
      </div>
      <div className="px-4 pt-3 pb-4 text-center text-xs text-gray-500 dark:text-gray-400 md:px-6 md:pt-4 md:pb-6">
        <a
          href="https://github.com/ivanfioravanti/chatbot-ollama"
          target="_blank"
          rel="noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors duration-200"
        >
          Chatbot Ollama
        </a>
        {' - '}
        <span className="text-gray-600 dark:text-gray-500">
          {t('Powered by local AI models')}
        </span>
      </div>
    </div>
  );
};
