import React, { useRef } from 'react';
import { activeTeam, activeClients, staff, costs, receivables, clientWork, currentLeader, personCapacity, problems, concentration } from '../domain/model.js';
import { personJoinedMonth, personLeftMonth, clientSinceMonth } from '../domain/dates.js';
import { eventDigest, eventSummary, discoveryAssignments, diaryMonths } from '../domain/daily-view.js';
import { personCondition } from '../domain/interaction.js';
import { schedules } from '../domain/schedules.js';
import { Button } from './ui.jsx';
import { Discovery } from './Evidence.jsx';
import { num, money, dateAt, monthNow, displayText } from '../game/format.js';

const policyLabels = { growth: '新分野を育てる', maintain: '既存の信頼を守る', focus: '採算を整える', organise: '組織化', stopVenture: '投資の整理' };
const styleLabels = { companion: '保守中心・既存の取引を育てる', delegated: '仲間と役割を分担', 'hands-on': '社長も現場へ', open: '今ある仕事を積み重ねる' };
const contactLabels = { available: '相談が届いている', passed: '今回は見送った', declined: '大口の相談を見送った', trial: '試作を進めた', negotiating: '契約を相談した', won: '契約につながった', lost: '契約に至らなかった' };

function ScheduleList({ state, compact = false }) {
  const rows = schedules(state).sort((a, b) => a.month - b.month);
  const now = monthNow(state);
  const renderRows = list => <ul className="schedule-list">{list.map(row => <li key={row.key}>
    <span>{row.label}</span>
    <strong>{row.month > now ? `あと${row.month - now}か月` : '確認時期'}</strong>
    <small>{dateAt(row.month)}</small>
  </li>)}</ul>;
  return <section className="detail-section">
    <h3>進んでいる仕事・予定</h3>
    {renderRows(compact ? rows.slice(0, 3) : rows)}
    {compact && rows.length > 3 && <details><summary>ほか{rows.length - 3}件の予定</summary>{renderRows(rows.slice(3))}</details>}
    {receivables(state) > 0 && <p className="note">入金待ち {money(receivables(state))}</p>}
    {!rows.length && !receivables(state) && <p className="note">期限付きの予定はありません。</p>}
  </section>;
}

function Support({ state, onHelp }) {
  if (state.ended || state.suspended || state.checkpoint || state.pending?.initiated || ['cyber', 'rescue', 'exit', 'successor', 'strategy', 'handover'].includes(state.pending?.type)) return null;
  const items = problems(state);
  if (!items.some(item => item.id === 'workload')) items.push({ id: 'workload', title: '受注・採用を調整する', text: '今の仕事量や、これからの体制を自分から見直せます。' });
  return <section className="detail-section">
    <h3>今、対処できること</h3>
    {items.map(item => <article className="support-item" key={item.id}>
      <h4>{item.title}</h4>
      <p>{item.text}</p>
      <Button onClick={() => onHelp(item.id)}>対処を考える</Button>
    </article>)}
    <p className="note">相談を開くだけでは時間は進みません。</p>
  </section>;
}

function Metrics({ state }) {
  const capacity = state.q
    ? state.last.capacity
    : (state.config.parameters.capacityPerPerson + activeTeam(state).reduce((sum, person) => sum + personCapacity(state, person), 0)) * state.skill;
  return <div className="metrics" aria-label="判断に使う会社の状態">
    <div className="metric"><span>手元資金</span><strong className={state.cash < costs(state) * 1.3 ? 'warning' : ''}>{money(state.cash)}</strong><small>通常費用 {money(costs(state))} / 3か月</small></div>
    <div className="metric"><span>納品できる仕事量{state.q > 0 && '（直近期）'}</span><strong>{money(capacity)} / 期</strong><small>1期＝3か月・売上換算</small></div>
    <div className="metric"><span>能力に対する仕事量</span><strong className={state.last.load > 1.1 ? 'warning' : ''}>{state.q ? `${num(state.last.load * 100)}%` : '未観測'}</strong><small>積み残し {money(state.backlog)}</small></div>
    <div className="metric"><span>会社の人数 / 顧客</span><strong>{staff(state) + 1}人 / {activeClients(state).length}社</strong><small>経営者を含む · 借入 {money(state.debt)}</small></div>
  </div>;
}

export function CompanyStatus({ state, onOpen, onHelp }) {
  const leader = currentLeader(state);
  const team = activeTeam(state);
  const clients = activeClients(state).slice().sort((a, b) => clientWork(state, b) - clientWork(state, a));
  return <aside className="current-status">
    <p className="eyebrow">{dateAt(monthNow(state))} · 現在の会社</p>
    <h2>{state.name}</h2>
    <p><strong>第{leader.number}代社長 {leader.name}</strong><br /><span className="note">{styleLabels[state.style]}</span></p>
    <div className="metrics compact-metrics">
      <div className="metric"><span>手元資金</span><strong>{money(state.cash)}</strong></div>
      <div className="metric"><span>借入</span><strong>{money(state.debt)}</strong></div>
      <div className="metric"><span>会社の人数</span><strong>{staff(state) + 1}人</strong><small>経営者を含む</small></div>
      <div className="metric"><span>継続顧客</span><strong>{clients.length}社</strong></div>
    </div>
    <p className="note">{state.q > 0 ? `${dateAt(state.q * 3)}の決算：納品 ${money(state.last.revenue)} / 期` : '初めての決算は3か月後。'}<br />現在の積み残し {money(state.backlog)}</p>
    <section className="company-faces">
      <h3>一緒に働く人</h3>
      {team.slice(0, 2).map(person => <article className="person-card" key={person.id}>
        <span className="name-mark" aria-hidden="true">{person.name.slice(0, 1)}</span>
        <div><strong>{person.name}</strong><small>{person.founding ? '創業から一緒' : `${dateAt(personJoinedMonth(state, person))}に入社`}</small><small>{personCondition(person).text}</small></div>
      </article>)}
      {!team.length && <p className="note">今は、経営者ひとりで会社を回しています。</p>}
      {team.length > 2 && <p className="note">ほか{team.length - 2}人が在籍</p>}
      <h3>今の取引</h3>
      {clients.slice(0, 2).map(client => <article className="person-card" key={client.id}>
        <span className="name-mark client-mark" aria-hidden="true">{client.name.slice(0, 1)}</span>
        <div><strong>{client.name}</strong><small>基準受注 {money(clientWork(state, client))} / 期</small></div>
      </article>)}
      {!clients.length && <p className="note">継続顧客は、まだいません。</p>}
      {clients.length > 2 && <p className="note">ほか{clients.length - 2}社との取引が継続中</p>}
      <Button onClick={() => onOpen('people')}>人と取引をすべて見る</Button>
    </section>
    <ScheduleList state={state} compact />
    <Button onClick={() => onOpen('company')}>会社のこと・経営の相談</Button>
    {problems(state).length > 0 && <Support state={state} onHelp={onHelp} />}
  </aside>;
}

export function EventRecord({ state, event, onEvent, dated = true }) {
  const digest = eventDigest(state, event);
  return <article className={`diary-event${digest.significant ? ' significant' : ''}`} data-record={event.id}>
    {dated && <p className="event-meta">{dateAt(event.month ?? event.q * 3)}</p>}
    <details>
      <summary>
        <span className="event-title">{digest.significant && <span className="turning-mark">転機</span>}{displayText(digest.title)}</span>
        {digest.scale && <strong className="event-scale">{displayText(digest.scale)}</strong>}
        {digest.participants.length > 0 && <small className="event-meta">関係者：{digest.participants.join('・')}</small>}
      </summary>
      <div className="event-text">
        <p>{displayText(event.text)}</p>
        {event.context && <p className="event-context">{displayText(event.context)}</p>}
        {digest.founders.length > 0 && <p className="note">{digest.founders.join('・')} · 創業からの仲間</p>}
        {digest.previous && <Button className="text-button" onClick={() => onEvent(digest.previous.id)}>関連する記録：{displayText(eventSummary(state, digest.previous).title)}</Button>}
        {(event.causes.length > 0 || event.entities.length > 0) && <Button className="text-button" onClick={() => onEvent(event.id)}>この出来事までの経緯</Button>}
      </div>
    </details>
  </article>;
}

function Settlement({ record }) {
  return <article className="diary-event settlement" data-record={`settlement-${record.q}`}>
    <details>
      <summary><span className="source-tag">四半期決算</span><span className="event-title">納品 {money(record.revenue)} · 入金 {money(record.collections)} · 利益 {money(record.profit)}</span></summary>
      <div className="event-text"><p>{dateAt(record.q * 3)}時点：手元 {money(record.cash)} · {record.staff + 1}人体制。直前3か月の集計です。</p><p>売上は納品した仕事、入金は実際に受け取った現金です。</p></div>
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

export function Diary({ state, all = false, onReading, onEvent, feedRef }) {
  const userScroll = useRef(false);
  const now = monthNow(state);
  const fromMonth = all ? 0 : Math.max(0, now - 59);
  const records = diaryRecords(state, fromMonth);
  const assignments = discoveryAssignments(state);
  const markIntent = () => { userScroll.current = true; };
  const handleScroll = event => {
    if (userScroll.current && event.currentTarget.scrollTop > 40) onReading?.();
    userScroll.current = false;
  };
  const handleDetails = event => {
    if (event.target.closest('summary')) onReading?.();
  };
  return <section className={`diary${all ? ' all-history' : ''}`}>
    <div className="diary-heading"><h2>{all ? '創業からの全日誌' : '会社の日誌'}</h2><span>{all ? '全期間' : '直近5年分'} · 新しい月から</span></div>
    {!all && <p className="note">{now >= 60 && `${dateAt(fromMonth)}以降を表示。`}全期間の記録は振り返りに残ります。</p>}
    <div className="status-line"><span>{dateAt(now)}</span>{!state.ended && <span>次の決算まで{3 - now % 3}か月</span>}</div>
    <div className="diary-feed" ref={feedRef} tabIndex={0} aria-label={`${all ? '全期間' : '直近5年分'}の会社の日誌・新しい月から`}
      onWheel={markIntent} onTouchMove={markIntent} onPointerDown={markIntent}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) markIntent(); }}
      onScroll={handleScroll} onClickCapture={handleDetails}>
      {diaryMonths(records).map(group => <section className="diary-month" key={group.month}>
        <h3>{dateAt(group.month)}{group.month === now && <span className="source-tag">今月</span>}</h3>
        {group.records.map(record => <React.Fragment key={record.id}>
          {record.type === 'event' && <><EventRecord state={state} event={record.event} onEvent={onEvent} dated={false} />{assignments.has(record.id) && <Discovery kind={assignments.get(record.id)} state={state} />}</>}
          {record.type === 'settlement' && <Settlement record={record.history} />}
          {record.type === 'growth' && <div className="diary-event"><p className="event-title">直近2期の売上：{money(state.history.find(history => history.q === 4).revenue)} → {money(state.history.find(history => history.q === 5).revenue)}</p><Discovery kind="growth" state={state} /></div>}
          {record.type === 'anniversary' && <div className="diary-event"><p className="event-title">創業{record.month / 12}年。直近1年間に会社を離れた仲間は{record.departures}人。</p><p className="note">{dateAt(record.month - 12)}から{dateAt(record.month)}までの、この会社の記録です。</p><Discovery kind="departures" state={state} /></div>}
        </React.Fragment>)}
      </section>)}
      {!records.length && <p className="note">この先の出来事が、ここに残ります。</p>}
    </div>
  </section>;
}

function Ledger({ state }) {
  const latest = state.last;
  const rows = state.q > 0 ? [
    ['期首の現金', money(latest.startCash)],
    ['納品した仕事の売上', money(latest.revenue)],
    ['給与・報酬・固定費・施策・外注費', `−${money(latest.operating)}`],
    ['借入利息', `−${money(latest.interest)}`],
    ['当期利益（売上 − 費用 − 利息）', money(latest.profit)],
    ['実際に回収した現金', `＋${money(latest.collections)}`],
    ['新規借入（売上に含めない）', `＋${money(latest.borrow)}`],
    ['返済元本（費用に含めない）', `−${money(latest.repay)}`],
    ['登録時に支払済みの金額', money(latest.prepaid)],
    ['直前の期末現金', money(state.history.at(-1).cash)],
  ] : [];
  rows.push(['現在の手元資金（期中の支出・入金を含む）', money(state.cash)], ['入金待ちの売掛金', money(receivables(state))], ['借入残高', money(state.debt)], ['前受金（納品前の負債）', money(state.life.advanceLiability)], ['現在の体制の通常費用', `${money(costs(state))} / 四半期`]);
  return <dl className="ledger">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function RecruitmentPlans({ state }) {
  const plans = state.life.recruitPlans.filter(plan => !plan.closed);
  const joins = state.threads.filter(thread => thread.type === 'join');
  if (!plans.length && !joins.length) return null;
  return <section className="detail-section">
    <h3>採用の進み具合</h3>
    {plans.map(plan => <article className="relationship-card" key={plan.id}>
      <strong>{plan.planned}名の年間採用計画</strong>
      <p>入社済み {plan.filled}人 · 年間集計は{dateAt(plan.review)}</p>
      <p className="note">{plan.path === 'open-market' ? (plan.filled ? '通常募集で入社済み。年間集計を待っています。' : '通常募集。採用活動の結果を待っています。') : '紹介を含む計画。通常募集とは分けて集計します。'}給与と人数が変わるのは入社した月からです。</p>
    </article>)}
    {joins.map(join => <p key={join.id}>{join.name}：{dateAt(join.dueMonth)}に入社予定 · まだ在籍人数には含みません。</p>)}
  </section>;
}

export function CompanyDetails({ state, onAction, onHelp }) {
  const leader = currentLeader(state);
  const blocked = Boolean(state.pending || state.ended || state.checkpoint || state.suspended);
  return <div>
    <p className="eyebrow">創業から{Math.floor(monthNow(state) / 12)}年{monthNow(state) % 12}か月</p>
    <h3>{state.name} · 第{leader.number}代 {leader.name}</h3>
    <Metrics state={state} />
    <Support state={state} onHelp={onHelp} />
    <ScheduleList state={state} />
    <RecruitmentPlans state={state} />
    <section className="detail-section">
      <h3>備えと、これからの経営</h3>
      <p>情報管理：{state.life.securityGroup === 'high' ? '組織的な運用' : '属人的な運用'}<br />隔離バックアップ {state.life.backup ? 'あり' : 'なし'} / 保険 {state.life.insurance ? 'あり' : 'なし'}</p>
      <p>{dateAt(leader.start)}からの経営。{state.life.handover && `${state.life.handover.name}への交代準備が進んでいます。`}</p>
      <div className="menu-grid">
        <Button onClick={() => onAction('policies')} disabled={blocked}>備え・前受金・債権回収</Button>
        <Button onClick={() => onAction('leadership')} disabled={blocked || Boolean(state.life.handover)}>社員・家族への世代交代</Button>
        <Button onClick={() => onAction('family')} disabled={blocked}>家族の後継候補を記録</Button>
        <Button onClick={() => onAction('strategy')} disabled={blocked}>組織・既存事業・新事業</Button>
        <Button onClick={() => onAction('exit')} disabled={blocked || Boolean(state.life.exitPlan)}>廃業・売却・合併を検討</Button>
      </div>
    </section>
    <details className="detail-section"><summary>会計の内訳</summary><Ledger state={state} /></details>
    <details className="detail-section"><summary>取引の集中度</summary><p>最大の取引先の基準受注は全体の{num(concentration(state) * 100)}%。対応する実企業の分布を確認できていないため、自社の値だけを表示します。</p></details>
    <nav className="menu-grid" aria-label="会社の記録と操作">
      {[
        ['people', '人と取引'], ['generations', '歴代経営者と業績'], ['history', '全期間の日誌'],
        ['evidence', 'データと遊び方'], ['export', '記録を書き出す'], ['save-pause', '保存・中断'],
        ['archives', '保存した会社'], ['new', '別の会社を始める'],
      ].map(([action, label]) => <Button key={action} onClick={() => onAction(action)} disabled={action === 'save-pause' && Boolean(state.ended || state.suspended)}>{label}</Button>)}
    </nav>
  </div>;
}

export function People({ state, onEvent, onContact }) {
  const team = activeTeam(state);
  const departed = state.people.filter(person => !person.active);
  const blocked = Boolean(state.pending || state.checkpoint || state.suspended || state.ended);
  return <div>
    {state.life.savedCandidates.length > 0 && <section className="detail-section"><h3>連絡先を残した採用候補</h3>{state.life.savedCandidates.map(candidate => <article className="relationship-card" key={candidate.id}>
      <strong>{candidate.name}</strong><p>{candidate.profile.label} · {candidate.status === 'held' ? '回答を保留中' : '入社を手配済み'}</p>
      {candidate.status === 'held' && <Button onClick={() => onContact(candidate.id)} disabled={blocked}>改めて連絡する</Button>}
    </article>)}</section>}
    <RecruitmentPlans state={state} />
    <section className="detail-section"><h3>今、一緒に働く人</h3><div className="people-list">
      {team.map(person => <article className="person-card" key={person.id}><div>
        <strong>{person.name}</strong><p>{person.role} · {person.profile.label}</p>
        <p>{person.founding ? '創業から一緒' : `${dateAt(personJoinedMonth(state, person))}に入社`} · 報酬 {money(person.salary)} / 期</p>
        <p>{person.profile.description}</p><p>{personCondition(person).text}</p>
        <p className="note">一緒に働いた期間 {Math.max(0, monthNow(state) - personJoinedMonth(state, person))}か月 · 仕事量の多かった期間 {person.overloadPeriods * 3}か月</p>
        {person.joinEvent && <Button className="text-button" onClick={() => onEvent(person.joinEvent)}>入社した日の記録</Button>}
      </div></article>)}
      {!team.length && <p>今は、経営者ひとりで会社を回しています。</p>}
    </div></section>
    {departed.length > 0 && <section className="detail-section"><h3>別の道へ進んだ仲間</h3><div className="people-list">{departed.map(person => <article className="relationship-card" key={person.id}><strong>{person.name}</strong><p>{dateAt(personJoinedMonth(state, person))}から{dateAt(personLeftMonth(state, person))}まで。</p><p>{displayText(person.leftReason)}</p></article>)}</div></section>}
    <section className="detail-section"><h3>取引先との関係</h3>{state.clients.map(client => <article className="relationship-card" key={client.id}>
      <strong>{client.name}</strong><span className="source-tag">{client.active ? '継続中' : '今回の取引は終了'}</span>
      <p>{clientSinceMonth(state, client) === 0 ? '創業時から' : `${dateAt(clientSinceMonth(state, client))}から`}のつながり{client.active && ` · 基準受注 ${money(clientWork(state, client))} / 期`}</p>
      {client.sourceEvent && <Button className="text-button" onClick={() => onEvent(client.sourceEvent)}>この関係のはじまり</Button>}
    </article>)}{!state.clients.length && <p>継続顧客は、まだいません。</p>}</section>
    {state.contacts.length > 0 && <details className="detail-section"><summary>相談した相手、つながらなかった話</summary>{state.contacts.map(contact => <p key={contact.id}><strong>{contact.name}</strong> · {contactLabels[contact.status]}</p>)}</details>}
    {state.life.family.length > 0 && <section className="detail-section"><h3>家族の後継候補</h3>{state.life.family.map(person => <p key={person.id}>{person.name} · {dateAt(person.registered)}に候補登録</p>)}<p className="note">候補登録だけでは社長・人数・資金は変わりません。</p></section>}
  </div>;
}

export function Generations({ state }) {
  const life = state.life;
  return <section className="detail-section">
    <h3>会社と、歴代の経営者</h3>
    <p>会社：{life.companyStatus === 'closed' ? '事業終了' : life.companyStatus === 'integrated' ? '他社・新会社へ統合' : '継続'}{state.suspended && ' · 保存・中断中'}</p>
    {life.epilogue && <section className="notice"><h4>引き継がれた事業の後日談</h4><p>{displayText(life.epilogue.text)}</p></section>}
    {life.ownerProceeds !== undefined && <p>売却対価（経営者に帰属）：{money(life.ownerProceeds)}。会社の手元資金には加えていません。価格式は仮定です。</p>}
    <div className="generation-list">{life.generations.map(generation => <article className="relationship-card" key={generation.number}>
      <h4>第{generation.number}代 · {generation.name}</h4>
      <p>{dateAt(generation.start)}から{generation.end === undefined ? '現在まで' : `${dateAt(generation.end)}まで`} · 方針：{policyLabels[generation.policy]}</p>
      <p>{generation.baselineLabel || '引継ぎ時'}：資金 {money(generation.baseline.cash)} · 借入 {money(generation.baseline.debt)} · {generation.baseline.staff}人 · 顧客{generation.baseline.clients.length}社 · 進行案件{generation.baseline.contracts.length}件</p>
      <div className="generation-observations">{[generation.baseline, ...generation.reviews].map((record, index) => <section className="generation-observation" key={record.month}>
        <p className="eyebrow">{index ? `${(record.month - generation.start) / 12}年後` : generation.baselineLabel || '引継ぎ時'} · {record.periodMonths > 0 ? `直近${record.periodMonths}か月` : '決算前'}</p>
        <div className="metrics"><div className="metric"><span>売上</span><strong>{money(record.revenue)}</strong></div><div className="metric"><span>利益</span><strong>{money(record.profit)}</strong></div><div className="metric"><span>人数</span><strong>{record.staff}人</strong></div></div>
      </section>)}</div>
    </article>)}</div>
    <p className="note">新事業・組織化・取引整理は、費用と日々の受注・納品を通じて結果が生まれます。年数だけの終了や、承継時の成長ボーナスはありません。</p>
    <Discovery kind="succession" state={state} />
  </section>;
}

function HistoryChart({ state, metric, label }) {
  const initial = metric === 'cash' ? state.initial.cash : state.initial.staff + 1;
  const values = [initial, ...state.history.map(history => metric === 'staff' ? history.staff + 1 : history.cash)];
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const x = index => 54 + index / Math.max(1, values.length - 1) * 476;
  const y = value => 135 - (value - lo) / (hi - lo) * 110;
  return <div className="detail-section"><h4>{label}</h4><svg className="chart" viewBox="0 0 550 165" role="img" aria-label={`${label}。創業時${num(initial)}から直近決算${num(values.at(-1))}`}>
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
  return <section className="result-page">
    <p className="eyebrow">{state.name} · {monthNow(state)}か月の記録</p>
    <h1>{endingTitle(state)}</h1>
    <div className="metrics"><div className="metric"><span>人数の変化</span><strong>{state.initial.staff + 1} → {staff(state) + 1}人</strong></div><div className="metric"><span>区切り時点の取引</span><strong>{activeClients(state).length}社</strong></div><div className="metric"><span>手元資金</span><strong>{money(state.cash)}</strong></div></div>
    {canContinue && <div className="notice"><p>ここまでの記録を残し、次の月から経営を続けられます。</p><Button variant="primary" onClick={onContinue}>この会社を続ける</Button></div>}
    <section className="detail-section"><h2>この会社が経験したこと</h2><p>年間採用計画の結果 {life.recruitHistory.length}件 · 計画未達 {life.recruitHistory.filter(plan => plan.filled < plan.planned).length}件</p><p>インシデント {life.incidents.length}件 · 影響なし {life.incidents.filter(incident => incident.noImpact).length}件</p><p className="note">1社の経歴です。調査の年率と直接比べる割合ではありません。採用計画の集計月と、実際の入社月は別に記録しています。</p></section>
    <ScheduleList state={state} />
    {state.backlog > 0 && <p>納めきれていない仕事 {money(state.backlog)}分</p>}
    {life.advanceLiability > 0 && <p>前受金 {money(life.advanceLiability)}の納品・返金義務が残っています。</p>}
    <Generations state={state} />
    <Diary state={state} all onEvent={onEvent} />
    <details className="detail-section"><summary>資金・人数の推移と会計</summary><HistoryChart state={state} metric="cash" label="手元資金 / 万円" /><HistoryChart state={state} metric="staff" label="会社の人数 / 人" /><Ledger state={state} /></details>
    <div className="button-row"><Button onClick={onExport}>記録を書き出す</Button><Button onClick={onNew}>別の会社の創業条件を見る</Button>{canContinue && <Button variant="primary" onClick={onContinue}>この会社を続ける</Button>}</div>
  </section>;
}
