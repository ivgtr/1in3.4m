import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {create,advance} from '../src/domain/model.js';import {continuation,REAL_START,loadBucket} from '../src/domain/insights.js';
const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
test('操作前の時間案内と実際の進行が一致し、表示だけでは乱数も状態も変えない',()=>{
 for(const origin of config.origins){const s=create(15,'A',config,origin.id),before=JSON.stringify(s);const a=continuation(s,advance),b=continuation(s,advance);assert.equal(JSON.stringify(s),before);assert.deepEqual(a,b);assert.deepEqual(a.next,advance(s));assert.equal(a.months,(a.next.q-s.q)*3);assert.equal(a.consultation,a.months===0&&!!a.next.pending);}
});
test('人数の実調査の分母と仕事量の区間を確認',()=>{
 assert.equal(REAL_START.values.reduce((a,b)=>a+b,0),100);assert.equal(REAL_START.n,1994);assert.deepEqual([.79,.8,1.1,1.11,1.5,1.51].map(loadBucket),[0,1,1,2,2,3]);
});
