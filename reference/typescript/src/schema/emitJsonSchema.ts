import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SPEC_SCHEMA_DIR } from '../paths.js';
import { SCHEMA_TARGETS } from './schemaTargets.js';

// Materialize the JSON Schemas from the Zod source of truth (schemaTargets.ts) into spec/schema/.
// They are generated, committed artifacts; schemaTargets.test.ts fences them against the source.
function main(): void {
  mkdirSync(SPEC_SCHEMA_DIR, { recursive: true });
  for (const [file, schema] of SCHEMA_TARGETS) {
    const path = resolve(SPEC_SCHEMA_DIR, file);
    writeFileSync(path, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
    console.log(`wrote ${path}`);
  }
}

main();
