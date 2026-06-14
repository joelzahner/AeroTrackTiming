export interface TagAssignment {
  startnummer: string;
  epc: string;
  timestamp: string;
  status: 'Locked' | 'Invalid';
}

export interface Registration {
  vorname: string;
  name: string;
  geburtsdatum: string; // YYYY-MM-DD
  startnummer: string;
  wohnort: string;
  gender: 'M' | 'W';
  club: boolean;
}

export interface Race {
  name: string; // For file: name.csv
}

export interface RaceEvent {
  startnummer: string; // Bib number
  typ: 'START' | 'ZIEL';
  timestamp: string; // High precision time string e.g. "14:22:04.12" or complete ISO / Local timestamp
  exactMs: number; // millisecond timestamp for backend/sorting
}

export interface FinisherResult {
  pos?: number;
  startnummer: string;
  name: string;
  vorname: string;
  gender: 'M' | 'W';
  geburtsdatum: string;
  wohnort: string;
  club: boolean;
  startTime?: string;
  startMs?: number;
  finishTime?: string;
  finishMs?: number;
  elapsedLabel: string; // e.g. "1:45:23.140" or "DNF"
  elapsedMs: number;
  diffLabel: string; // e.g. "+00:00:00.945" or "-"
}

export interface CategoryConfig {
  name: string;
  minYear: number;
  maxYear: number;
  club: 'Ja' | 'Nein';
  gender: 'M' | 'W' | 'Alle';
}
