import { expectTypeOf, describe, it } from 'vitest';
import { Promptuna } from '../../../src/Promptuna';
import type { ChatCompletionResponse } from '../../../src/providers/types';

describe('Type-level tests for public SDK', () => {
  it('Promptuna.chatCompletion returns Promise<ChatCompletionResponse>', () => {
    type Ret = ReturnType<Promptuna['chatCompletion']>;
    expectTypeOf<Ret>().toEqualTypeOf<Promise<ChatCompletionResponse>>();
  });
});
