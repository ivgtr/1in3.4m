import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

// 操作テストにはクラス参照だけを提供する。描画はViteと実ブラウザで確認する。
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.module.css')) return nextLoad(url, context);
    const css = readFileSync(new URL(url), 'utf8');
    const names = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => match[1]);
    const classes = Object.fromEntries(names.map(name => [name, name]));
    return { format: 'module', source: `export default ${JSON.stringify(classes)}`, shortCircuit: true };
  },
});
