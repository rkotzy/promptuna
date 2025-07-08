import { PromptunaError } from '../config/types';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: {
    template: string;
  };
}

export interface RenderedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class TemplateError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_ERROR', details);
  }
}