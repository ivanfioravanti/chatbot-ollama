import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
  handleSendMessage: (message: string) => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
