import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OllamaModelID, OllamaModels, fallbackModelID } from '@/types/ollama';
import { Prompt } from '@/types/prompt';

import { Quiz } from '@/components/Quiz/Quiz';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

interface Props {
  defaultModelId: OllamaModelID;
}

const Home = ({ defaultModelId }: Props) => {
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: { lightMode },
    dispatch,
  } = contextValue;

  const { data, error } = useQuery({
    queryKey: ['GetModels'],
    queryFn: () => getModels(),
    enabled: true,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (data) dispatch({ field: 'models', value: data });
  }, [data, dispatch]);

  useEffect(() => {
    dispatch({ field: 'modelError', value: getModelsError(error) });
  }, [dispatch, error, getModelsError]);

  const handleSendMessage = async (message: string) => {
    dispatch({ field: 'loading', value: true });

    const chatBody = {
      model: defaultModelId,
      messages: [
        {
          role: 'system',
          content: DEFAULT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: DEFAULT_TEMPERATURE,
    };

    const controller = new AbortController();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(chatBody),
    });

    if (!response.ok) {
      dispatch({ field: 'loading', value: false });
      return;
    }

    const data = response.body;
    if (!data) {
      dispatch({ field: 'loading', value: false });
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let messageContent = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      messageContent += chunkValue;

      // Update the UI with the accumulated message content
      const messageElement = document.querySelector('[data-message-author="assistant"]');
      if (messageElement) {
        messageElement.textContent = messageContent;
      } else {
        const newMessageElement = document.createElement('div');
        newMessageElement.setAttribute('data-message-author', 'assistant');
        newMessageElement.textContent = messageContent;
        document.body.appendChild(newMessageElement);
      }
    }

    dispatch({ field: 'loading', value: false });
  };

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleSendMessage,
      }}
    >
      <Head>
        <title>Natalie's Quiz Bot</title>
        <meta name="description" content="AI-powered quiz generator" />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`flex flex-col h-screen w-screen ${lightMode ? 'light' : 'dark'}`}>
        <main className="flex-1 overflow-hidden bg-gradient-to-b from-purple-50 to-pink-50">
          <Quiz onSendMessage={handleSendMessage} />
        </main>
      </div>
    </HomeContext.Provider>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId = fallbackModelID as OllamaModelID;

  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'chat', 'sidebar'])),
      defaultModelId,
    },
  };
};
