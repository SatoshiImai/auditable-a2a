import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPEC_SCHEMA_DIR } from '../paths.js';
import { SCHEMA_TARGETS } from './schemaTargets.js';

// Drift fence: the committed JSON Schemas under spec/schema/ equal the Zod source of truth. A change
// to wire.ts without `npm run schema:json` fails here.
describe('the committed JSON Schemas match the Zod source of truth', () => {
  for (const [file, schema] of SCHEMA_TARGETS) {
    it(`${file} matches`, () => {
      const committed = JSON.parse(readFileSync(resolve(SPEC_SCHEMA_DIR, file), 'utf8'));
      expect(committed).toEqual(schema);
    });
  }
});
