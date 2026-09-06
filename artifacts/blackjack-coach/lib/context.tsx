import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action } from './strategy';
import { DEFAULT_TABLE_RULES, normalizeTableRules, TableRules } from './rules';

export type Decision = {
  id: string;
  spot?: number;
  playerCards: string[];
  dealerCard: string;
  playerCardLabels?: string[];
  dealerCardLabel?: string;
  chosen: Action;
  correct: Action;
  isCorrect: boolean;
  basicAction?: Action;
  countAdjustedAction?: Action;
  gradingMode?: 'basic' | 'hilo-index';
  runningCount?: number;
  trueCount?: number;
  indexApplied?: boolean;
  thresholdLabel?: string | null;
  explanation?: string;
  profileId?: string | null;
};

export type HandRecord = {
  id: string;
  decisions: Decision[];
  outcome: 'Win' | 'Loss' | 'Push' | 'Surrender';
  bet?: number;
  netChange?: number;
  insuranceBet?: number;
  insuranceNet?: number;
  dealerCards?: string[];
  playerHands?: { cards: string[]; bet: number; outcome: string; netChange: number; spot?: number; label?: string }[];
  /** Optional simultaneous-table metadata; older persisted records intentionally omit it. */
  spotBets?: number[];
  roundLabel?: string;
};

export type Session = {
  id: string;
  date: string;
  hands: HandRecord[];
  rules?: TableRules;
  bankrollStart?: number;
  bankrollEnd?: number;
  bankrollAdded?: number;
};

type CoachContextType = {
  history: Session[];
  activeSession: Session | null;
  startSession: (rules?: TableRules) => void;
  endSession: (bankrollEnd?: number) => string | null;
  recordHand: (hand: HandRecord) => void;
  addBankroll: (amount: number) => boolean;
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
      bankrollStart: 1000,
    });
  };

  const endSession = (bankrollEnd?: number): string | null => {
    if (activeSession && activeSession.hands.length > 0) {
      const finished = { ...activeSession, bankrollEnd: bankrollEnd ?? activeSession.bankrollEnd };
      saveHistory([finished, ...history]);
      setActiveSession(null);
      return finished.id;
    }
    setActiveSession(null);
    return null;
  };

  const recordHand = (hand: HandRecord) => {
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        hands: [...activeSession.hands, hand]
      });
    }
  };

  const addBankroll = (amount: number): boolean => {
    if (!activeSession || !Number.isFinite(amount) || amount <= 0) return false;
    setActiveSession(current => current ? {
      ...current,
      bankrollAdded: (current.bankrollAdded ?? 0) + amount,
    } : current);
    return true;
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  return (
    <CoachContext.Provider value={{ history, activeSession, startSession, endSession, recordHand, addBankroll, clearHistory }}>
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

  const bookCorrect = decisions.filter(d => d.chosen === (d.basicAction ?? d.correct)).length;
  const bookAccuracy = total === 0 ? 0 : bookCorrect / total;
  const indexComparable = decisions.filter(d => d.countAdjustedAction !== undefined);
  const indexCorrect = indexComparable.filter(d => d.chosen === d.countAdjustedAction).length;
  const indexAccuracy = indexComparable.length === 0 ? 0 : indexCorrect / indexComparable.length;
  
  let grade = 'F';
  if (accuracy >= 0.98) grade = 'A+';
  else if (accuracy >= 0.95) grade = 'A';
  else if (accuracy >= 0.90) grade = 'B';
  else if (accuracy >= 0.80) grade = 'C';
  else if (accuracy >= 0.70) grade = 'D';

  return {
    total,
    correct,
    accuracy,
    bookCorrect,
    bookAccuracy,
    indexCorrect,
    indexAccuracy,
    hasIndexComparison: indexComparable.length === total && total > 0,
    grade,
    decisions,
    mode: normalizeTableRules(session.rules).accuracyMode ?? 'basic',
  };
}
