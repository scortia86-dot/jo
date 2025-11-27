
export enum TabType {
  SURVEY = 'SURVEY',
  CURRICULUM = 'CURRICULUM',
  WORK = 'WORK',
  SUGGESTION = 'SUGGESTION'
}

export interface WorkItem {
  id: string;
  month: string;
  department?: string;
  title: string;
  goal: string;
  lessonLearned: string;
  status: string;
  why: string;
  plan: string;
  ownerId?: string;
  createdAt?: any;
}

export interface SuggestionItem {
  id: string;
  category: string;
  title: string;
  goal: string;
  lessonLearned: string;
  status: string;
  why: string;
  plan: string;
  ownerId?: string;
  createdAt?: any;
}

export interface PayoffItem {
  id: string;
  activity: string;
  importance: number;
  satisfaction: number;
  proposer: string;
  grade: string;
  memo: string;
  ownerId?: string;
  createdAt?: any;
}

export interface WorkImprovementItem {
  id: string;
  targetWork: string;
  reason: string;
  plan: string;
  ownerId?: string;
  createdAt?: any;
}
