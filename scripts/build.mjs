import { build } from 'vite';
import { checkBundle } from './bundle-budget.mjs';

const result = await build();
console.table(checkBundle(result.output));
