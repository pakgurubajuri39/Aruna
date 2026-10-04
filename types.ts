export type Role = 'user' | 'model';

export interface Message {
  role: Role;
  text: string;
  timestamp: Date;
  emotion?: AssistantExpression;
}

export type AssistantExpression = 'neutral' | 'talking' | 'listening' | 'thinking';

export type CameraFraming = 'closeup' | 'waist' | 'wide';

export type StudioLighting = 'warm_studio' | 'twilight_lounge' | 'midnight_focus';

export enum NaylaTopic {
  EDUCATION = 'Education',
  EMOTIONAL_SUPPORT = 'Emotional Support',
  LIFE_COACHING = 'Life Coaching'
}
