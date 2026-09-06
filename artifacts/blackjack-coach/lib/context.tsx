import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action } from './strategy';
import { DEFAULT_TABLE_RULES, normalizeTableRules, TableRules } from './rules';

export type Decision = {
  id: string;
  playerCards: string[];
  dealerCard: string;
  chosen: Action;
  correct: Action;
  isCorrect: boolean;
};

export type HandRecord = {
  id: string;
  decisions: Decision[];
  outcome: 'Win' | 'Loss' | 'Push' | 'Surrender';
};

export type Session = {
  id: string;
  date: string;
  hands: HandRecord[];
  rules?: TableRules;
};

type CoachContextType = {
  history: Session[];
  activeSession: Session | null;
  startSession: (rules?: TableRules) => void;
  endSession: () => void;
  recordHand: (hand: HandRecord) => void;
  clearHistory: () => void;
};

const CoachContext = createContext<CoachContextType | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('blackjack_history').then(data => {
      if (data) setHistory(JSON.parse(data).map((session: Session) => ({ ...session, rules: normalizeTableRules(session.rules) })));
    });
  }, []);

  const saveHistory = async (newHistory: Session[]) => {
    setHistory(newHistory);
    await AsyncStorage.setItem('blackjack_history', JSON.stringify(newHistory));
  };

  const startSession = (rules: TableRules = DEFAULT_TABLE_RULES) => {
    setActiveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      hands: [],
      rules: normalizeTableRules(rules),
    });
  };

  const endSession = () => {
    if (activeSession && activeSession.hands.length > 0) {
      saveHistory([activeSession, ...history]);
    }
    setActiveSession(null);
  };

  const recordHand = (hand: HandRecord) => {
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        hands: [...activeSession.hands, hand]
      });
    }
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  return (
    <CoachContext.Provider value={{ history, activeSession, startSession, endSession, recordHand, clearHistory }}>
      {children}
    </CoachContext.Provider>
  );
}

export const useCoach = () => {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error('useCoach must be used within CoachProvider');
  return ctx;
};

export function getSessionStats(session: Session) {
  const decisions = session.hands.flatMap(h => h.decisions);
  const total = decisions.length;
  const correct = decisions.filter(d => d.isCorrect).length;
  const accuracy = total === 0 ? 0 : correct / total;
  
  let grade = 'F';
  if (accuracy >= 0.98) grade = 'A+';
  else if (accuracy >= 0.95) grade = 'A';
  else if (accuracy >= 0.90) grade = 'B';
  else if (accuracy >= 0.80) grade = 'C';
  else if (accuracy >= 0.70) grade = 'D';

  return { total, correct, accuracy, grade, decisions };
}
