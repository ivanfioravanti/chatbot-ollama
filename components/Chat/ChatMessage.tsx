import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
  IconFileTypePdf,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

// Import safely to avoid build issues
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
// Replace direct import with a dynamic approach for rehype-mathjax
// import rehypeMathjax from 'rehype-mathjax';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit }) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content != messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const { messages } = selectedConversation;
    const findIndex = messages.findIndex((elm) => elm === message);

    if (findIndex < 0) return;

    if (
      findIndex < messages.length - 1 &&
      messages[findIndex + 1].role === 'assistant'
    ) {
      messages.splice(findIndex, 2);
    } else {
      messages.splice(findIndex, 1);
    }
    const updatedConversation = {
      ...selectedConversation,
      messages,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );
    homeDispatch({ field: 'selectedConversation', value: single });
    homeDispatch({ field: 'conversations', value: all });
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      toast.success(t('Copied message') || 'Copied message');
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };

  useEffect(() => {
    setMessageContent(message.content);
  }, [message.content]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  return (
    <div
      className={`group md:px-4 message-bubble ${
        message.role === 'assistant'
          ? 'bg-gradient-to-br from-message-assistant-light to-gray-50 dark:from-message-assistant-dark dark:to-gray-800/50 backdrop-blur-sm'
          : 'bg-gradient-to-br from-message-user-light to-white dark:from-message-user-dark dark:to-gray-800/50 backdrop-blur-sm'
      }`}
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] text-right">
          {message.role === 'assistant' ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-purple text-white shadow-card hover:shadow-hover transition-all duration-200 group-hover:scale-105">
              <IconRobot size={20} stroke={2} />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-green to-accent-blue text-white shadow-card hover:shadow-hover transition-all duration-200 group-hover:scale-105">
              <IconUser size={20} stroke={2} />
            </div>
          )}
        </div>

        <div className="prose mt-[-2px] w-full dark:prose-invert">
          {message.role === 'user' ? (
            <div className="flex w-full">
              {isEditing ? (
                <div className="flex w-full flex-col">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none whitespace-pre-wrap border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 p-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                    value={messageContent}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    onCompositionStart={() => setIsTyping(true)}
                    onCompositionEnd={() => setIsTyping(false)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      margin: '0',
                      overflow: 'hidden',
                    }}
                  />

                  <div className="mt-6 flex justify-center space-x-3">
                    <button
                      className="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all duration-200 shadow-card hover:shadow-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleEditMessage}
                      disabled={messageContent.trim().length <= 0}
                    >
                      {t('Save & Submit')}
                    </button>
                    <button
                      className="px-6 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
                      onClick={() => {
                        setMessageContent(message.content);
                        setIsEditing(false);
                      }}
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  {message.file && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                      <IconFileTypePdf size={16} className="text-red-600" />
                      <div className="text-sm">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {message.file.name}
                        </div>
                        {message.file.metadata && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {message.file.metadata.pages && `${message.file.metadata.pages} pages`}
                            {message.file.metadata.title && ` • ${message.file.metadata.title}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="prose whitespace-pre-wrap dark:prose-invert">
                    {message.content}
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-2 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 group/tooltip"
                    onClick={toggleEditing}
                    title={t('Edit message')}
                  >
                    <IconEdit size={18} stroke={1.5} className="group-hover/tooltip:rotate-12 transition-transform duration-200" />
                  </button>
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 group/tooltip"
                    onClick={copyOnClick}
                    title={t('Copy message')}
                  >
                    <IconCopy size={18} stroke={1.5} className="group-hover/tooltip:scale-125 transition-transform duration-200" />
                  </button>
                  <button
                    className="invisible group-hover:visible focus:visible text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110 group/tooltip"
                    onClick={handleDeleteMessage}
                    title={t('Delete message')}
                  >
                    <IconTrash size={18} stroke={1.5} className="group-hover/tooltip:rotate-12 transition-transform duration-200" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-row">
              <MemoizedReactMarkdown
                className="prose dark:prose-invert flex-1"
                remarkPlugins={[remarkGfm, remarkMath]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const childrenArray = Array.isArray(children) ? children : [children];
                    if (childrenArray.length) {
                      if (childrenArray[0] === '▍') {
                        return <span className="animate-pulse cursor-default mt-1">▍</span>
                      }

                      if (typeof childrenArray[0] === 'string') {
                        childrenArray[0] = childrenArray[0].replace("`▍`", "▍");
                      }
                    }

                    const match = /language-(\w+)/.exec(className || '');

                    return !inline ? (
                      <CodeBlock
                        key={Math.random()}
                        language={(match && match[1]) || ''}
                        value={String(children).replace(/\n$/, '')}
                        {...props}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return (
                      <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                        {children}
                      </table>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="break-words border border-black px-3 py-1 dark:border-white">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {`${message.content}${
                  messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                }`}
              </MemoizedReactMarkdown>

              <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-2 md:gap-1 items-center md:items-start justify-end md:justify-start">
                {messagedCopied ? (
                  <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 animate-scale-in">
                    <IconCheck size={18} stroke={1.5} />
                  </div>
                ) : (
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 group/tooltip"
                    onClick={copyOnClick}
                    title={t('Copy message')}
                  >
                    <IconCopy size={18} stroke={1.5} className="group-hover/tooltip:scale-125 transition-transform duration-200" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
