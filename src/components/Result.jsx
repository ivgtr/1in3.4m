import React from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { Guidance } from './Guidance.jsx';
import { Button } from './Button.jsx';
import { num, money, dateAt, monthNow } from '../game/format.js';
import { staff, activeClients } from '../domain/model.js';
import { ScheduleList } from './CompanyStatus.jsx';
import { Ledger } from './CompanyDetails.jsx';
import { Generations } from './Generations.jsx';
import { Diary } from './Diary.jsx';

function HistoryChart({ state, metric, label }) {
  const initial = metric === 'cash' ? state.initial.cash : state.initial.staff + 1;
  const values = [initial, ...state.history.map(history => metric === 'staff' ? history.staff + 1 : history.cash)];
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const x = index => 54 + index / Math.max(1, values.length - 1) * 476;
  const y = value => 135 - (value - lo) / (hi - lo) * 110;
  return <div className={shared['detail-section']}><h4>{label}</h4><svg className={styles['chart']} viewBox="0 0 550 165" role="img" aria-label={`${label}。創業時${num(initial)}から直近決算${num(values.at(-1))}`}>
    <line x1="54" y1="25" x2="530" y2="25" /><line x1="54" y1="135" x2="530" y2="135" />
    <text x="0" y="29">{num(hi)}</text><text x="0" y="139">{num(lo)}</text>
    <polyline points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} fill="none" />
    {values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r="2.7"><title>{`${dateAt(index * 3)}：${num(value)}`}</title></circle>)}
    <text x="54" y="158">創業</text><text x="460" y="158">{state.q * 3}か月</text>
  </svg></div>;
}

function endingTitle(state) {
  if (state.suspended) return '記録を保存して、中断しています。';
  if (state.checkpoint) return `${monthNow(state) / 12}年を重ねた。会社の時間は、この先へ。`;
  return {
    observed: '経営を続けたまま、今回の観測を終えた。',
    voluntary: '自主廃業を選び、会社を閉じた。',
    liquidated: '再建を断念し、清算へ進んだ。',
    sold: '独立した会社としての物語を終えた。',
    merged: '新しい会社へ統合された。',
    closed: 'ここで経営の区切りを選びました。',
    insolvent: '支払いをつなげず、経営を終えました。',
  }[state.ended];
}

export function Result({ state, onContinue, onNew, onExport, onEvent }) {
  const canContinue = Boolean(state.suspended || state.checkpoint || state.ended === 'observed');
  const life = state.life;
  return <section className={styles['result-page']}>
    <p className={shared['eyebrow']}>{state.name} · {monthNow(state)}か月の記録</p>
    <h1>{endingTitle(state)}</h1>
    <div className={styles['metrics']}><div className={styles['metric']}><span>人数の変化</span><strong>{state.initial.staff + 1} → {staff(state) + 1}人</strong></div><div className={styles['metric']}><span>区切り時点の取引</span><strong>{activeClients(state).length}社</strong></div><div className={styles['metric']}><span>手元資金</span><strong>{money(state.cash)}</strong></div></div>
    {canContinue && <Guidance title="経営を続けられます" actions={<Button variant="primary" onClick={onContinue}>この会社を続ける</Button>}><p>ここまでの記録を残し、次の月から経営を続けられます。</p></Guidance>}
    <section className={shared['detail-section']}><h2>この会社が経験したこと</h2><p>年間採用計画の結果 {life.recruitHistory.length}件 · 計画未達 {life.recruitHistory.filter(plan => plan.filled < plan.planned).length}件</p><p>インシデント {life.incidents.length}件 · 影響なし {life.incidents.filter(incident => incident.noImpact).length}件</p><p className={shared['note']}>1社の経歴です。調査の年率と直接比べる割合ではありません。採用計画の集計月と、実際の入社月は別に記録しています。</p></section>
    <ScheduleList state={state} />
    {state.backlog > 0 && <p>納めきれていない仕事 {money(state.backlog)}分</p>}
    {life.advanceLiability > 0 && <p>前受金 {money(life.advanceLiability)}の納品・返金義務が残っています。</p>}
    <Generations state={state} />
    <Diary state={state} all onEvent={onEvent} />
    <details className={shared['detail-section']}><summary>資金・人数の推移と会計</summary><HistoryChart state={state} metric="cash" label="手元資金 / 万円" /><HistoryChart state={state} metric="staff" label="会社の人数 / 人" /><Ledger state={state} /></details>
    <div className={shared['button-row']}><Button onClick={onExport}>記録を書き出す</Button><Button onClick={onNew}>別の会社の創業条件を見る</Button>{canContinue && <Button variant="primary" onClick={onContinue}>この会社を続ける</Button>}</div>
  </section>;
}
