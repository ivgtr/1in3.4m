import React from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { Button } from './Button.jsx';
import { money, dateAt, monthNow, displayText } from '../game/format.js';
import { activeTeam, clientWork } from '../domain/model.js';
import { personJoinedMonth, personLeftMonth, clientSinceMonth } from '../domain/dates.js';
import { personCondition } from '../domain/interaction.js';
import { RecruitmentPlans } from './CompanyDetails.jsx';
const contactLabels = { available: '相談が届いている', passed: '今回は見送った', declined: '大口の相談を見送った', trial: '試作を進めた', negotiating: '契約を相談した', won: '契約につながった', lost: '契約に至らなかった' };

export function People({ state, onEvent, onContact }) {
  const team = activeTeam(state);
  const departed = state.people.filter(person => !person.active);
  const blocked = Boolean(state.pending || state.checkpoint || state.suspended || state.ended);
  return <div>
    {state.life.savedCandidates.length > 0 && <section className={shared['detail-section']}><h3>連絡先を残した採用候補</h3>{state.life.savedCandidates.map(candidate => <article className={shared['relationship-card']} key={candidate.id}>
      <strong>{candidate.name}</strong><p>{candidate.profile.label} · {candidate.status === 'held' ? '回答を保留中' : '入社を手配済み'}</p>
      {candidate.status === 'held' && <Button onClick={() => onContact(candidate.id)} disabled={blocked}>改めて連絡する</Button>}
    </article>)}</section>}
    <RecruitmentPlans state={state} />
    <section className={shared['detail-section']}><h3>今、一緒に働く人</h3><div className={styles['people-list']}>
      {team.map(person => <article className={styles['person-card']} key={person.id}><div>
        <strong>{person.name}</strong><p>{person.role} · {person.profile.label}</p>
        <p>{person.founding ? '創業から一緒' : `${dateAt(personJoinedMonth(state, person))}に入社`} · 報酬 {money(person.salary)} / 期</p>
        <p>{person.profile.description}</p><p>{personCondition(person).text}</p>
        <p className={shared['note']}>一緒に働いた期間 {Math.max(0, monthNow(state) - personJoinedMonth(state, person))}か月 · 仕事量の多かった期間 {person.overloadPeriods * 3}か月</p>
        {person.joinEvent && <Button className={shared['text-button']} onClick={() => onEvent(person.joinEvent)}>入社した日の記録</Button>}
      </div></article>)}
      {!team.length && <p>今は、経営者ひとりで会社を回しています。</p>}
    </div></section>
    {departed.length > 0 && <section className={shared['detail-section']}><h3>別の道へ進んだ仲間</h3><div className={styles['people-list']}>{departed.map(person => <article className={shared['relationship-card']} key={person.id}><strong>{person.name}</strong><p>{dateAt(personJoinedMonth(state, person))}から{dateAt(personLeftMonth(state, person))}まで。</p><p>{displayText(person.leftReason)}</p></article>)}</div></section>}
    <section className={shared['detail-section']}><h3>取引先との関係</h3>{state.clients.map(client => <article className={shared['relationship-card']} key={client.id}>
      <strong>{client.name}</strong><span className={`${shared['source-tag']} ${styles['source-tag']}`}>{client.active ? '継続中' : '今回の取引は終了'}</span>
      <p>{clientSinceMonth(state, client) === 0 ? '創業時から' : `${dateAt(clientSinceMonth(state, client))}から`}のつながり{client.active && ` · 基準受注 ${money(clientWork(state, client))} / 期`}</p>
      {client.sourceEvent && <Button className={shared['text-button']} onClick={() => onEvent(client.sourceEvent)}>この関係のはじまり</Button>}
    </article>)}{!state.clients.length && <p>継続顧客は、まだいません。</p>}</section>
    {state.contacts.length > 0 && <details className={shared['detail-section']}><summary>相談した相手、つながらなかった話</summary>{state.contacts.map(contact => <p key={contact.id}><strong>{contact.name}</strong> · {contactLabels[contact.status]}</p>)}</details>}
    {state.life.family.length > 0 && <section className={shared['detail-section']}><h3>家族の後継候補</h3>{state.life.family.map(person => <p key={person.id}>{person.name} · {dateAt(person.registered)}に候補登録</p>)}<p className={shared['note']}>候補登録だけでは社長・人数・資金は変わりません。</p></section>}
  </div>;
}
