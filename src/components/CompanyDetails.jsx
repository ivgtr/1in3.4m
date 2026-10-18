import React from 'react';
import styles from './CompanyViews.module.css';
import shared from './shared.module.css';
import { Button } from './Button.jsx';
import { num, money, dateAt, monthNow } from '../game/format.js';
import { activeTeam, activeClients, staff, costs, receivables, currentLeader, personCapacity, concentration } from '../domain/model.js';
import { ScheduleList, Support } from './CompanyStatus.jsx';

function Metrics({ state }) {
  const capacity = state.q
    ? state.last.capacity
    : (state.config.parameters.capacityPerPerson + activeTeam(state).reduce((sum, person) => sum + personCapacity(state, person), 0)) * state.skill;
  return <div className={styles['metrics']} aria-label="判断に使う会社の状態">
    <div className={styles['metric']}><span>手元資金</span><strong className={state.cash < costs(state) * 1.3 ? shared['warning'] : ''}>{money(state.cash)}</strong><small>通常費用 {money(costs(state))} / 3か月</small></div>
    <div className={styles['metric']}><span>納品できる仕事量{state.q > 0 && '（直近期）'}</span><strong>{money(capacity)} / 期</strong><small>1期＝3か月・売上換算</small></div>
    <div className={styles['metric']}><span>能力に対する仕事量</span><strong className={state.last.load > 1.1 ? shared['warning'] : ''}>{state.q ? `${num(state.last.load * 100)}%` : '未観測'}</strong><small>積み残し {money(state.backlog)}</small></div>
    <div className={styles['metric']}><span>会社の人数 / 顧客</span><strong>{staff(state) + 1}人 / {activeClients(state).length}社</strong><small>経営者を含む · 借入 {money(state.debt)}</small></div>
  </div>;
}

export function Ledger({ state }) {
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
  return <dl className={styles['ledger']}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function RecruitmentPlans({ state }) {
  const plans = state.life.recruitPlans.filter(plan => !plan.closed);
  const joins = state.threads.filter(thread => thread.type === 'join');
  if (!plans.length && !joins.length) return null;
  return <section className={shared['detail-section']}>
    <h3>採用の進み具合</h3>
    {plans.map(plan => <article className={shared['relationship-card']} key={plan.id}>
      <strong>{plan.planned}名の年間採用計画</strong>
      <p>入社済み {plan.filled}人 · 年間集計は{dateAt(plan.review)}</p>
      <p className={shared['note']}>{plan.path === 'open-market' ? (plan.filled ? '通常募集で入社済み。年間集計を待っています。' : '通常募集。採用活動の結果を待っています。') : '紹介を含む計画。通常募集とは分けて集計します。'}給与と人数が変わるのは入社した月からです。</p>
    </article>)}
    {joins.map(join => <p key={join.id}>{join.name}：{dateAt(join.dueMonth)}に入社予定 · まだ在籍人数には含みません。</p>)}
  </section>;
}

export function CompanyDetails({ state, onAction, onHelp }) {
  const leader = currentLeader(state);
  const blocked = Boolean(state.pending || state.ended || state.checkpoint || state.suspended);
  return <div>
    <p className={shared['eyebrow']}>創業から{Math.floor(monthNow(state) / 12)}年{monthNow(state) % 12}か月</p>
    <h3>{state.name} · 第{leader.number}代 {leader.name}</h3>
    <Metrics state={state} />
    <Support state={state} onHelp={onHelp} />
    <ScheduleList state={state} />
    <RecruitmentPlans state={state} />
    <section className={shared['detail-section']}>
      <h3>備えと、これからの経営</h3>
      <p>情報管理：{state.life.securityGroup === 'high' ? '組織的な運用' : '属人的な運用'}<br />隔離バックアップ {state.life.backup ? 'あり' : 'なし'} / 保険 {state.life.insurance ? 'あり' : 'なし'}</p>
      <p>{dateAt(leader.start)}からの経営。{state.life.handover && `${state.life.handover.name}への交代準備が進んでいます。`}</p>
      <div className={styles['menu-grid']}>
        <Button onClick={() => onAction('policies')} disabled={blocked}>備え・前受金・債権回収</Button>
        <Button onClick={() => onAction('leadership')} disabled={blocked || Boolean(state.life.handover)}>社員・家族への世代交代</Button>
        <Button onClick={() => onAction('family')} disabled={blocked}>家族の後継候補を記録</Button>
        <Button onClick={() => onAction('strategy')} disabled={blocked}>組織・既存事業・新事業</Button>
        <Button onClick={() => onAction('exit')} disabled={blocked || Boolean(state.life.exitPlan)}>廃業・売却・合併を検討</Button>
      </div>
    </section>
    <details className={shared['detail-section']}><summary>会計の内訳</summary><Ledger state={state} /></details>
    <details className={shared['detail-section']}><summary>取引の集中度</summary><p>最大の取引先の基準受注は全体の{num(concentration(state) * 100)}%。対応する実企業の分布を確認できていないため、自社の値だけを表示します。</p></details>
    <nav className={styles['menu-grid']} aria-label="会社の記録と操作">
      {[
        ['people', '人と取引'], ['generations', '歴代経営者と業績'], ['history', '全期間の日誌'],
        ['evidence', 'データと遊び方'], ['export', '記録を書き出す'], ['save-pause', '保存・中断'],
        ['archives', '保存した会社'], ['new', '別の会社を始める'],
      ].map(([action, label]) => <Button key={action} onClick={() => onAction(action)} disabled={action === 'save-pause' && Boolean(state.ended || state.suspended)}>{label}</Button>)}
    </nav>
  </div>;
}
