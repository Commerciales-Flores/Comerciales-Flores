// contexts/IndicatorContext.tsx
import { createContext, useContext, useState } from 'react';
import TopIndicator from '../components/TopIndicator';
import type { ReactNode } from 'react';

export type IndicatorType = 'login' | 'logout' | 'security';

interface IndicatorContextType {
  showIndicator: (message: string, type?: IndicatorType) => void;
}

const IndicatorContext = createContext<IndicatorContextType | undefined>(undefined);

export const IndicatorProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<IndicatorType>('login');

  const showIndicator = (msg: string, t: IndicatorType = 'login') => {
    setMessage(msg);
    setType(t);
  };

  return (
    <IndicatorContext.Provider value={{ showIndicator }}>
      {children}
      {message && <TopIndicator message={message} type={type} />}
    </IndicatorContext.Provider>
  );
};

export const useIndicator = () => {
  const context = useContext(IndicatorContext);
  if (!context) throw new Error('useIndicator must be used within IndicatorProvider');
  return context;
};