import React, { useRef } from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { Button } from './Button.jsx';
import { money, dateAt, monthNow, displayText } from '../game/format.js';
import { eventDigest, eventSummary, discoveryAssignments, diaryMonths } from '../domain/daily-view.js';
import { personLeftMonth } from '../domain/dates.js';
import { historyReadIntent } from '../domain/view-state.js';
import { Discovery } from './Discovery.jsx';

function EventRecord({ state, event, onEvent, dated = true }) {
  const digest = eventDigest(state, event);
  return <article className={`${styles['diary-event']} ${digest.significant ? styles['significant'] : ''}`} data-record={event.id}>
    {dated && <p className={styles['event-meta']}>{dateAt(event.month ?? event.q * 3)}</p>}
    <details>
      <summary>
        <span className={styles['event-title']}>{digest.significant && <span className={styles['turning-mark']}>転機</span>}{displayText(digest.title)}</span>
        {digest.scale && <strong className={styles['event-scale']}>{displayText(digest.scale)}</strong>}
        {digest.participants.length > 0 && <small className={styles['event-meta']}>関係者：{digest.participants.join('・')}</small>}
      </summary>
      <div className={styles['event-text']}>
        <p>{displayText(event.text)}</p>
        {event.context && <p className={styles['event-context']}>{displayText(event.context)}</p>}
        {digest.founders.length > 0 && <p className={shared['note']}>{digest.founders.join('・')} · 創業からの仲間</p>}
        {digest.previous && <Button className={shared['text-button']} onClick={() => onEvent(digest.previous.id)}>関連する記録：{displayText(eventSummary(state, digest.previous).title)}</Button>}
        {(event.causes.length > 0 || event.entities.length > 0) && <Button className={shared['text-button']} onClick={() => onEvent(event.id)}>この出来事までの経緯</Button>}
      </div>
    </details>
  </article>;
}

function Settlement({ record }) {
  return <article className={styles['diary-event']} data-record={`settlement-${record.q}`}>
    <details>
      <summary><span className={`${shared['source-tag']} ${styles['source-tag']}`}>四半期決算</span><span className={styles['event-title']}>納品 {money(record.revenue)} · 入金 {money(record.collections)} · 利益 {money(record.profit)}</span></summary>
      <div className={styles['event-text']}><p>{dateAt(record.q * 3)}時点：手元 {money(record.cash)} · {record.staff + 1}人体制。直前3か月の集計です。</p><p>売上は納品した仕事、入金は実際に受け取った現金です。</p></div>
    </details>
  </article>;
}

function diaryRecords(state, fromMonth) {
  const records = state.events.filter(event => (event.month ?? event.q * 3) >= fromMonth).map((event, order) => ({ id: event.id, month: event.month ?? event.q * 3, order, type: 'event', event }));
  for (const history of state.history.filter(record => record.q * 3 >= fromMonth)) {
    records.push({ id: `settlement-${history.q}`, month: history.q * 3, order: state.events.length + history.q, type: 'settlement', history });
  }
  if (monthNow(state) >= 15 && fromMonth <= 15) records.push({ id: 'growth-observation', month: 15, order: state.events.length + state.history.length + 1, type: 'growth' });
  for (let month = Math.max(60, Math.ceil(fromMonth / 60) * 60); month <= monthNow(state); month += 60) {
    const departures = state.people.filter(person => !person.active && personLeftMonth(state, person) > month - 12 && personLeftMonth(state, person) <= month).length;
    records.push({ id: `anniversary-${month}`, month, order: state.events.length + state.history.length + 2, type: 'anniversary', departures });
  }
  return records.sort((a, b) => b.month - a.month || a.order - b.order);
}

export function Diary({ state, all = false, onReading, onEvent, feedRef, reading = false, onLatest }) {
  const userScroll = useRef(false);
  const now = monthNow(state);
  const fromMonth = all ? 0 : Math.max(0, now - 59);
  const records = diaryRecords(state, fromMonth);
  const assignments = discoveryAssignments(state);
  const markIntent = () => { userScroll.current = true; };
  const handleScroll = event => {
    if (historyReadIntent({ intent: userScroll.current, top: event.currentTarget.scrollTop })) {
      onReading?.();
      userScroll.current = false;
    }
  };
  const handleDetails = event => {
    if (event.target.closest('summary')) onReading?.();
  };
  return <section className={`${styles['diary']} ${all ? styles['all-history'] : ''}`}>
    <div className={styles['diary-heading']}><h2>{all ? '創業からの全日誌' : '会社の日誌'}</h2><span>{all ? '全期間' : '直近5年分'} · 新しい月から</span>{onLatest && <Button onClick={onLatest} disabled={!reading}>最新へ戻る</Button>}</div>
    {!all && <p className={shared['note']}>{now >= 60 && `${dateAt(fromMonth)}以降を表示。`}全期間の記録は振り返りに残ります。</p>}
    <div className={`${shared['status-line']} ${styles['status-line']}`}><span>{dateAt(now)}</span>{!state.ended && <span>次の決算まで{3 - now % 3}か月</span>}</div>
    <div className={styles['diary-feed']} ref={feedRef} tabIndex={0} aria-label={`${all ? '全期間' : '直近5年分'}の会社の日誌・新しい月から`}
      onWheel={markIntent} onTouchMove={markIntent} onPointerDown={markIntent}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) markIntent(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) userScroll.current = false; }}
      onScroll={handleScroll} onClickCapture={handleDetails}>
      {diaryMonths(records).map(group => <section className={styles['diary-month']} key={group.month}>
        <h3>{dateAt(group.month)}{group.month === now && <span className={`${shared['source-tag']} ${styles['source-tag']}`}>今月</span>}</h3>
        {group.records.map(record => <React.Fragment key={record.id}>
          {record.type === 'event' && <><EventRecord state={state} event={record.event} onEvent={onEvent} dated={false} />{assignments.has(record.id) && <Discovery kind={assignments.get(record.id)} state={state} />}</>}
          {record.type === 'settlement' && <Settlement record={record.history} />}
          {record.type === 'growth' && <div className={styles['diary-event']}><p className={styles['event-title']}>直近2期の売上：{money(state.history.find(history => history.q === 4).revenue)} → {money(state.history.find(history => history.q === 5).revenue)}</p><Discovery kind="growth" state={state} /></div>}
          {record.type === 'anniversary' && <div className={styles['diary-event']}><p className={styles['event-title']}>創業{record.month / 12}年。直近1年間に会社を離れた仲間は{record.departures}人。</p><p className={shared['note']}>{dateAt(record.month - 12)}から{dateAt(record.month)}までの、この会社の記録です。</p><Discovery kind="departures" state={state} /></div>}
        </React.Fragment>)}
      </section>)}
      {!records.length && <p className={shared.empty}>この先の出来事が、ここに残ります。</p>}
    </div>
  </section>;
}
