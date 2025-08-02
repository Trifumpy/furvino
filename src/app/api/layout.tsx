"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of your novel data
interface Novel {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  // Define other properties as needed
}

// Define the shape of the context
interface NovelsContextType {
  novels: Novel[];
  isLoading: boolean;
  error: Error | null;
}

// Create the context
const NovelsContext = createContext<NovelsContextType | undefined>(undefined);

// Create the provider component
export function NovelsProvider({ children }: { children: ReactNode }) {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/novels');

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        setNovels(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNovels();
  }, []);

  return (
    <NovelsContext.Provider value={{ novels, isLoading, error }}>
      {children}
    </NovelsContext.Provider>
  );
}

// Create a custom hook for easy context consumption
export function useNovels() {
  const context = useContext(NovelsContext);
  if (context === undefined) {
    throw new Error('useNovels must be used within a NovelsProvider');
  }
  return context;
}
