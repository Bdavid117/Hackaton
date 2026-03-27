import type { ClaritySession } from "../data/loader";

type SessionState = {
  sessions: ClaritySession[];
  sourceName: string;
  updatedAt: string;
};

const state: SessionState = {
  sessions: [],
  sourceName: "",
  updatedAt: "",
};

export function setSessions(sessions: ClaritySession[], sourceName: string) {
  state.sessions = sessions;
  state.sourceName = sourceName;
  state.updatedAt = new Date().toISOString();
}

export function getSessions(): SessionState {
  return state;
}
