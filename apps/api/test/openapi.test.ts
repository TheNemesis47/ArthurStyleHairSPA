import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { generateOpenApi, OPENAPI_PATH } from '../src/openapi.ts';

describe('contratto OpenAPI', () => {
  it('packages/contracts/openapi.json è aggiornato (altrimenti: pnpm --filter @arthur/api openapi)', async () => {
    expect(await generateOpenApi()).toBe(await readFile(OPENAPI_PATH, 'utf8'));
  });
});
