import { IconClearAll, IconClipboard, IconPlayerPause, IconPlayerPlay, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { MemoizedChatMessage } from './MemoizedChatMessage';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');
  const {
    state: {
      selectedConversation,
      conversations,
      models,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [autoScrollLocked, setAutoScrollLocked] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const buildPromptFromMessages = useCallback((messages: Message[]) => {
    const lines: string[] = [];
    for (const m of messages) {
      const role = m.role === 'assistant' ? 'Assistant' : 'User';
      const text = (m.content || '').trim();
      if (text) lines.push(`${role}: ${text}`);
      const attach = m?.file?.metadata?.contentText;
      const fname = m?.file?.name;
      if (attach && fname && m.role === 'user') {
        lines.push(`[Attachment: ${fname}]\n${attach}`);
      }
    }
    return lines.join('\n\n');
  }, []);

  const copyConversation = useCallback(async () => {
    try {
      if (!selectedConversation) return;
      const text = buildPromptFromMessages(selectedConversation.messages);
      if (!text) {
        toast.success(t('Nothing to copy') || 'Nothing to copy');
        return;
      }
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(t('Copied conversation') || 'Copied conversation');
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        toast.success(t('Copied conversation') || 'Copied conversation');
      }
    } catch (e) {
      toast.error(t('Failed to copy') || 'Failed to copy');
    }
  }, [selectedConversation, buildPromptFromMessages, t]);

  const showErrorToast = useCallback(
    (
      title: string,
      detail?: string,
      onRetry?: () => void,
    ) => {
      toast.custom((t) => (
        <div
          className={`max-w-[540px] w-[92vw] md:w-[540px] rounded-lg border border-red-300 bg-white text-red-700 shadow-lg dark:border-red-800/40 dark:bg-[#2a2b32] dark:text-red-300 ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
        >
          <div className="px-4 py-3">
            <div className="font-semibold mb-1">{title}</div>
            {detail && (
              <div className="text-sm opacity-80 break-words whitespace-pre-wrap">
                {detail}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <button
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  onClick={() => {
                    toast.dismiss(t.id);
                    onRetry();
                  }}
                >
                  Retry
                </button>
              )}
              <button
                className="rounded-md border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </button>
              {detail && typeof navigator !== 'undefined' && navigator.clipboard && (
                <button
                  className="ml-auto rounded-md border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => navigator.clipboard.writeText(detail)}
                >
                  Copy details
                </button>
              )}
            </div>
          </div>
        </div>
      ), { duration: 8000 });
    },
    [],
  );

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, imagesBase64?: string[]) => {
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        // Build a stable transcript with roles and any user attachments inline
        const visiblePrompt = buildPromptFromMessages(updatedConversation.messages);
        const chatBody: ChatBody = {
          model: updatedConversation.model.name,
          system: updatedConversation.prompt,
          prompt: visiblePrompt,
          images: imagesBase64 && imagesBase64.length ? imagesBase64 : undefined,
          options: { temperature: updatedConversation.temperature },
        };
        const endpoint = getEndpoint();
        let body;
        body = JSON.stringify({
          ...chatBody,
        });
        const controller = new AbortController();
        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body,
          });
          if (!response.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            let title = 'Request failed';
            let detail: string | undefined;
            try {
              const err = await response.json();
              title = err?.error || title;
              detail = [err?.message, err?.suggestion].filter(Boolean).join('\n');
            } catch {}
            if (!navigator.onLine) {
              detail = (detail ? detail + '\n' : '') + 'You appear to be offline.';
            }
            showErrorToast(title, detail, () => handleSend(message, 1));
            return;
          }
          const data = response.body;
          if (!data) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            showErrorToast('Empty response', 'No data received from API.', () => handleSend(message, 1));
            return;
          }
          if (!false) {
            if (updatedConversation.messages.length === 1) {
              const { content } = message;
              const customName =
                content.length > 30 ? content.substring(0, 30) + '...' : content;
              updatedConversation = {
                ...updatedConversation,
                name: customName,
              };
            }
            homeDispatch({ field: 'loading', value: false });
            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let isFirst = true;
            let text = '';
            while (!done) {
              if (stopConversationRef.current === true) {
                controller.abort();
                done = true;
                break;
              }
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              const chunkValue = decoder.decode(value);
              text += chunkValue;
              if (isFirst) {
                isFirst = false;
                const updatedMessages: Message[] = [
                  ...updatedConversation.messages,
                  { role: 'assistant', content: chunkValue },
                ];
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              } else {
                const updatedMessages: Message[] =
                  updatedConversation.messages.map((message, index) => {
                    if (index === updatedConversation.messages.length - 1) {
                      return {
                        ...message,
                        content: text,
                      };
                    }
                    return message;
                  });
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              }
            }
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              (conversation) => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'messageIsStreaming', value: false });
          } else {
            const { answer } = await response.json();
            const updatedMessages: Message[] = [
              ...updatedConversation.messages,
              { role: 'assistant', content: answer },
            ];
            updatedConversation = {
              ...updatedConversation,
              messages: updatedMessages,
            };
            homeDispatch({
              field: 'selectedConversation',
              value: updatedConversation,
            });
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              (conversation) => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
          }
        } catch (err) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          if ((err as any)?.name === 'AbortError') {
            // Silently ignore manual aborts
            return;
          }
          const msg = (err as any)?.message || 'Unexpected error';
          const detail = !navigator.onLine
            ? `${msg}\nYou appear to be offline.`
            : msg;
          showErrorToast('Request error', detail, () => handleSend(message, 1));
          return;
        }
      }
    },
    [
      conversations,
      selectedConversation,
      stopConversationRef,
      homeDispatch,
      showErrorToast,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        if (!autoScrollLocked) {
          setAutoScrollEnabled(true);
        }
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const toggleAutoScroll = () => {
    setAutoScrollLocked((locked) => {
      const next = !locked;
      if (next) {
        setAutoScrollEnabled(false);
      }
      return next;
    });
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  return (
    <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#0e1728] dark:to-[#0b1220] transition-colors duration-300">
        <>
          <div
            className="max-h-full overflow-x-hidden select-text"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages.length === 0 ? (
              <>
                <div className="mx-auto flex flex-col space-y-6 md:space-y-12 px-4 pt-6 md:pt-16 sm:max-w-[600px]">
                  <div className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-purple bg-clip-text text-transparent mb-4 animate-fade-in">
                      {models.length === 0 ? (
                        <div className="flex items-center justify-center">
                          <Spinner size="20px" className="mr-3" />
                          <span className="text-gray-600 dark:text-gray-300">Loading models...</span>
                        </div>
                      ) : (
                        'Chatbot Ollama'
                      )}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg animate-slide-up">
                      Your AI assistant powered by local models
                    </p>
                  </div>

                  {models.length > 0 && (
                    <div className="card p-6 space-y-6 animate-scale-in">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configuration</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Customize your AI experience</p>
                      </div>
                      
                      <div className="space-y-4">
                        <ModelSelect />

                        <SystemPrompt
                          conversation={selectedConversation}
                          prompts={prompts}
                          onChangePrompt={(prompt) =>
                            handleUpdateConversation(selectedConversation, {
                              key: 'prompt',
                              value: prompt,
                            })
                          }
                        />

                        <TemperatureSlider
                          label={t('Temperature')}
                          onChangeTemperature={(temperature) =>
                            handleUpdateConversation(selectedConversation, {
                              key: 'temperature',
                              value: temperature,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex justify-center items-center gap-3 bg-white/80 dark:bg-[#0e1728]/80 backdrop-blur-lg border-b border-gray-200 dark:border-[#1b2a4a] py-3 px-4 text-sm text-gray-600 dark:text-gray-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('Model')}:</span>
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">{selectedConversation?.model.name}</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('Temp')}:</span>
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">{selectedConversation?.temperature}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
                      onClick={handleSettings}
                      title={t('Settings')}
                    >
                      <IconSettings size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
                      onClick={copyConversation}
                      title={t('Copy messages') || 'Copy messages'}
                    >
                      <IconClipboard size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
                      onClick={onClearAll}
                      title={t('Clear all')}
                    >
                      <IconClearAll size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:scale-105"
                      onClick={toggleAutoScroll}
                      title={autoScrollLocked ? (t('Enable auto-scroll') || 'Enable auto-scroll') : (t('Disable auto-scroll') || 'Disable auto-scroll')}
                    >
                      {autoScrollLocked ? (
                        <IconPlayerPlay size={16} />
                      ) : (
                        <IconPlayerPause size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {showSettings && (
                  <div className="flex flex-col space-y-6 md:mx-auto md:max-w-xl md:gap-6 md:py-4 md:pt-8 lg:max-w-2xl lg:px-0 xl:max-w-3xl animate-slide-down">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Model Settings</h3>
                      <ModelSelect />
                    </div>
                  </div>
                )}

                <div className="space-y-4 py-4">
                  {selectedConversation?.messages.map((message, index) => (
                    <MemoizedChatMessage
                      key={index}
                      message={message}
                      messageIndex={index}
                      onEdit={(editedMessage) => {
                        setCurrentMessage(editedMessage);
                        // discard edited message and the ones that come after then resend
                        handleSend(
                          editedMessage,
                          selectedConversation?.messages.length - index,
                        );
                      }}
                    />
                  ))}
                </div>

                {loading && <ChatLoader />}

                <div
                  className="h-[180px] bg-transparent"
                  ref={messagesEndRef}
                />
              </>
            )}
          </div>

          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message, imagesBase64) => {
              setCurrentMessage(message);
              handleSend(message, 0, imagesBase64);
            }}
            onScrollDownClick={handleScrollDown}
            onRegenerate={() => {
              if (currentMessage) {
                handleSend(currentMessage, 2);
              }
            }}
            showScrollDownButton={showScrollDownButton}
          />
        </>
    </div>
  );
});
Chat.displayName = 'Chat';
