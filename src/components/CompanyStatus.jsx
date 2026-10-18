import React from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { Button } from './Button.jsx';
import { money, dateAt, monthNow } from '../game/format.js';
import { activeTeam, activeClients, staff, receivables, clientWork, currentLeader, problems } from '../domain/model.js';
import { personJoinedMonth } from '../domain/dates.js';
import { personCondition } from '../domain/interaction.js';
import { schedules } from '../domain/schedules.js';
const styleLabels = { companion: '保守中心・既存の取引を育てる', delegated: '仲間と役割を分担', 'hands-on': '社長も現場へ', open: '今ある仕事を積み重ねる' };

export function ScheduleList({ state, compact = false }) {
  const rows = schedules(state).sort((a, b) => a.month - b.month);
  const now = monthNow(state);
  const renderRows = list => <ul className={styles['schedule-list']}>{list.map(row => <li key={row.key}>
    <span>{row.label}</span>
    <strong>{row.month > now ? `あと${row.month - now}か月` : '確認時期'}</strong>
    <small>{dateAt(row.month)}</small>
  </li>)}</ul>;
  return <section className={shared['detail-section']}>
    <h3>進んでいる仕事・予定</h3>
    {renderRows(compact ? rows.slice(0, 3) : rows)}
    {compact && rows.length > 3 && <details><summary>ほか{rows.length - 3}件の予定</summary>{renderRows(rows.slice(3))}</details>}
    {receivables(state) > 0 && <p className={shared['note']}>入金待ち {money(receivables(state))}</p>}
    {!rows.length && !receivables(state) && <p className={shared['note']}>期限付きの予定はありません。</p>}
  </section>;
}

export function Support({ state, onHelp }) {
  if (state.ended || state.suspended || state.checkpoint || state.pending?.initiated || ['cyber', 'rescue', 'exit', 'successor', 'strategy', 'handover'].includes(state.pending?.type)) return null;
  const items = problems(state);
  if (!items.some(item => item.id === 'workload')) items.push({ id: 'workload', title: '受注・採用を調整する', text: '今の仕事量や、これからの体制を自分から見直せます。' });
  return <section className={shared['detail-section']}>
    <h3>今、対処できること</h3>
    {items.map(item => <article className={styles['support-item']} key={item.id}>
      <h4>{item.title}</h4>
      <p>{item.text}</p>
      <Button onClick={() => onHelp(item.id)}>対処を考える</Button>
    </article>)}
    <p className={shared['note']}>相談を開くだけでは時間は進みません。</p>
  </section>;
}

export function CompanyStatus({ state, onOpen, onHelp }) {
  const leader = currentLeader(state);
  const team = activeTeam(state);
  const clients = activeClients(state).slice().sort((a, b) => clientWork(state, b) - clientWork(state, a));
  return <aside className={styles['current-status']}>
    <p className={shared['eyebrow']}>{dateAt(monthNow(state))} · 現在の会社</p>
    <h2>{state.name}</h2>
    <p><strong>第{leader.number}代社長 {leader.name}</strong><br /><span className={shared['note']}>{styleLabels[state.style]}</span></p>
    <div className={styles['metrics']}>
      <div className={styles['metric']}><span>手元資金</span><strong>{money(state.cash)}</strong></div>
      <div className={styles['metric']}><span>借入</span><strong>{money(state.debt)}</strong></div>
      <div className={styles['metric']}><span>会社の人数</span><strong>{staff(state) + 1}人</strong><small>経営者を含む</small></div>
      <div className={styles['metric']}><span>継続顧客</span><strong>{clients.length}社</strong></div>
    </div>
    <p className={shared['note']}>{state.q > 0 ? `${dateAt(state.q * 3)}の決算：納品 ${money(state.last.revenue)} / 期` : '初めての決算は3か月後。'}<br />現在の積み残し {money(state.backlog)}</p>
    <section className={styles['company-faces']}>
      <h3>一緒に働く人</h3>
      {team.slice(0, 2).map(person => <article className={styles['person-card']} key={person.id}>
        <span className={styles['name-mark']} aria-hidden="true">{person.name.slice(0, 1)}</span>
        <div><strong>{person.name}</strong><small>{person.founding ? '創業から一緒' : `${dateAt(personJoinedMonth(state, person))}に入社`}</small><small>{personCondition(person).text}</small></div>
      </article>)}
      {!team.length && <p className={shared['note']}>今は、経営者ひとりで会社を回しています。</p>}
      {team.length > 2 && <p className={shared['note']}>ほか{team.length - 2}人が在籍</p>}
      <h3>今の取引</h3>
      {clients.slice(0, 2).map(client => <article className={styles['person-card']} key={client.id}>
        <span className={styles['name-mark']} aria-hidden="true">{client.name.slice(0, 1)}</span>
        <div><strong>{client.name}</strong><small>基準受注 {money(clientWork(state, client))} / 期</small></div>
      </article>)}
      {!clients.length && <p className={shared['note']}>継続顧客は、まだいません。</p>}
      {clients.length > 2 && <p className={shared['note']}>ほか{clients.length - 2}社との取引が継続中</p>}
      <Button onClick={() => onOpen('people')}>人と取引をすべて見る</Button>
    </section>
    <ScheduleList state={state} compact />
    <Button onClick={() => onOpen('company')}>会社のこと・経営の相談</Button>
    {problems(state).length > 0 && <Support state={state} onHelp={onHelp} />}
  </aside>;
}
