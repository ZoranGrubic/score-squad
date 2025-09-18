import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Match {
  id: string;
  external_id: number;
  competition_id: string;
  status: string;
  match_date: number;
  stage?: string;
  home_team?: {
    id: string;
    name: string;
    short_name?: string;
    crest?: string;
  };
  away_team?: {
    id: string;
    name: string;
    short_name?: string;
    crest?: string;
  };
}

interface Friend {
  id: string;
  full_name?: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

interface Competition {
  id: string;
  name: string;
}

interface CompetitionContextType {
  competitionName: string;
  setCompetitionName: (name: string) => void;
  selectedMatches: Match[];
  setSelectedMatches: (matches: Match[]) => void;
  selectedFriends: Friend[];
  setSelectedFriends: (friends: Friend[]) => void;
  selectedCompetitions: Competition[];
  setSelectedCompetitions: (competitions: Competition[]) => void;
  clearAll: () => void;
}

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competitionName, setCompetitionName] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<Match[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [selectedCompetitions, setSelectedCompetitions] = useState<Competition[]>([]);

  const clearAll = () => {
    console.log('=== CLEARING ALL CONTEXT DATA ===');
    console.log('Before clear - selectedMatches:', selectedMatches.length);
    setCompetitionName('');
    setSelectedMatches([]);
    setSelectedFriends([]);
    setSelectedCompetitions([]);
    console.log('=== CONTEXT CLEARED ===');
  };

  return (
    <CompetitionContext.Provider
      value={{
        competitionName,
        setCompetitionName,
        selectedMatches,
        setSelectedMatches,
        selectedFriends,
        setSelectedFriends,
        selectedCompetitions,
        setSelectedCompetitions,
        clearAll,
      }}
    >
      {children}
    </CompetitionContext.Provider>
  );
}

export function useCompetition() {
  const context = useContext(CompetitionContext);
  if (context === undefined) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
}