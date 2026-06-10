import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '@playwright/test';
import type { z } from 'zod';

/**
 * Shared base for the domain API clients. Holds the request context and `validated()`, which
 * wraps a call in a named `test.step`, asserts `ok()`, and parses the body against a zod schema.
 */
export abstract class BaseApi {
  constructor(protected readonly request: APIRequestContext) {}

  protected validated<T>(
    stepName: string,
    schema: z.ZodType<T>,
    call: () => Promise<APIResponse>,
  ): Promise<T> {
    return test.step(stepName, async () => {
      const res = await call();
      expect(res.ok(), `${stepName} failed: ${res.status()}`).toBeTruthy();
      return schema.parse(await res.json());
    });
  }
}
