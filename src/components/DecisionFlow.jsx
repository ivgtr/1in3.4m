import React, { useEffect, useMemo, useState } from 'react';
import { availableDecisionOptions, costs, orderBudget, previewAutoChoice, receivables, staff } from '../domain/model.js';
import { discoveryAssignments } from '../domain/daily-view.js';
import { isLightChoice } from '../domain/interaction.js';
import { useGame } from '../game/GameProvider.jsx';
import { dateAt, displayText, money } from '../game/format.js';
import { Button, ChoiceCard, Dialog } from './ui.jsx';
import { Discovery } from './Evidence.jsx';

export function Progress({ clock, label }) {
  const [progress, setProgress] = useState(clock.progress);
  const running = clock.running;
  useEffect(() => {
    let frame;
    const draw = () => {
      setProgress(clock.progress);
      if (clock.running) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [clock, running, clock.generation]);
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span className="progress-fill" style={{ transform: `scaleX(${progress})` }} /></div>;
}

function DecisionContext({ state, decision }) {
  const finance = ['finance', 'crisis', 'rescue', 'exit'].includes(decision.type);
  const hiring = decision.options.some(option => ['hire', 'welcome', 'recruit', 'inhouse'].includes(option.id)) || ['hiring', 'workload', 'large'].includes(decision.type);
  if (finance) return <aside className="decision-context"><p>手元資金 <b>{money(state.cash)}</b> · 借入 {money(state.debt)}<br />入金待ち {money(receivables(state))} · 通常費用 {money(costs(state))}／3か月</p><p className="note">借入は現金と負債を同額増やします。利益には含めず、利息・返済は後日発生します。</p></aside>;
  if (!hiring) return <aside className="decision-context">手元資金 <b>{money(state.cash)}</b> · {staff(state) + 1}人体制</aside>;
  const budget = orderBudget(state);
  const ending = state.contracts.filter(contract => contract.active && contract.end * 3 >= state.calendarMonth && contract.end * 3 <= state.calendarMonth + 3);
  const hires = state.threads.filter(thread => ['join', 'recruit', 'annualRecruit'].includes(thread.type));
  return <aside className="decision-context"><p>{staff(state) + 1}人体制 · <b>次期の受注目安 {money(budget.committed)}／期</b><br />今の能力 {money(budget.capacity)}／期 · 積み残し {money(budget.backlog)}<br />手元 {money(state.cash)} · 通常費用 {money(costs(state))}／期</p>{ending.map(contract => <p key={contract.id}>{state.clients.find(client => client.id === contract.clientId).name}：{money(contract.value)}／期、{dateAt(contract.end * 3)}{contract.end * 3 === state.calendarMonth ? 'に終了' : 'まで'}</p>)}{hires.map(thread => <p key={thread.id}>{thread.name || '採用計画'}：{dateAt(thread.dueMonth ?? thread.due * 3)} {thread.type === 'join' ? '入社予定' : '結果待ち（未確定）'}</p>)}<p className="note">受注は変動する見込み。今回の追加案件は含まず、積み残しは別枠。1期は3か月です。</p></aside>;
}

function Receipt({ state }) {
  const receipt = state.decisionReceipt;
  const assignments = discoveryAssignments(state);
  const discovery = receipt.events.map(event => assignments.get(event.id)).find(Boolean);
  return <>
    <p className="eyebrow">{dateAt(receipt.month)}{receipt.automatic ? ' · おまかせの返答' : ''}</p>
    {(receipt.changes.length > 0 || receipt.outcomes?.length > 0) && <section><h3>今変わったこと</h3><div className="receipt-changes">{receipt.outcomes?.map((line, index) => <p key={`outcome-${index}`}>{displayText(line).replace(/（[\d,.]+ → [\d,.]+ \/ 100）/g, '')}</p>)}{receipt.changes.map(line => <p key={line}>{displayText(line)}</p>)}</div></section>}
    {receipt.future.length > 0 && <section><h3>これから届くこと</h3><ul>{receipt.future.map(line => <li key={line}>{displayText(line)}</li>)}</ul></section>}
    {receipt.events.length > 0 && <details><summary>対応の詳細</summary>{receipt.events.map(event => <p key={event.id}>{displayText(event.text)}</p>)}</details>}
    {discovery && <Discovery kind={discovery} state={state} />}
    {state.pending && <p>次の相談：{state.pending.title}</p>}
  </>;
}

export function DecisionFlow() {
  const game = useGame();
  const { state, preferences, clock, actions, autoReady } = game;
  const decision = state?.pending;
  const receipt = state?.decisionReceipt;
  const [selected, setSelected] = useState(null);
  useEffect(() => { setSelected(null); }, [decision?.id, receipt?.eventId]);
  const planned = useMemo(() => autoReady && !receipt ? previewAutoChoice(state, preferences.auto) : null, [state, preferences?.auto, autoReady, receipt]);
  if (!decision && !receipt) return null;
  const options = receipt ? [] : availableDecisionOptions(state);
  const chosen = options.find(option => option.id === selected);
  const canAuto = receipt ? receipt.automatic : autoReady;
  const paused = !clock.wanted;
  const status = receipt
    ? receipt.automatic ? (clock.running ? '結果を表示中 · まもなく日常へ' : '結果表示を一時停止 · 再開できます') : '結果確認中 · 続けると再開'
    : autoReady ? (clock.running ? `まもなく「${planned.title}」を選びます` : '自動判断は一時停止 · 自分で選ぶか再開') : 'あなたの選択待ち · 選ぶまで時間は停止';
  const pauseForInteraction = () => { if (canAuto && clock.running) actions.pause(); };
  const discovery = !receipt && ['hiring', 'workload', 'large'].includes(decision.type) && decision.options.some(option => ['hire', 'welcome', 'recruit'].includes(option.id)) && !state.decisions.some(item => ['hire', 'welcome', 'recruit'].includes(item.choiceId)) ? 'hiring' : !receipt && decision.type === 'successor' && state.life.generations.length === 1 ? 'succession' : null;
  return <Dialog open={!!receipt || !state.decisionHeld} title={receipt ? receipt.action : decision.title} subtitle={receipt ? '選択の結果' : `相談 · ${dateAt(state.calendarMonth)}`} size="wide" dismissible={false} onInteract={pauseForInteraction} headerActions={<>
    {!receipt && <Button onClick={actions.hold}>いったん畳んで会社を見る</Button>}
    {canAuto && <Button data-keep-playing onClick={actions.toggle}>{paused ? '再開' : '一時停止'}</Button>}
  </>} footer={<div className="decision-footer"><div className="decision-status"><p role="status">{status}</p>{canAuto && <Progress clock={clock} label={receipt ? '結果の表示時間' : '自動判断までの経過'} />}</div>{receipt ? <Button variant="primary" onClick={actions.finishResult}>{state.ended || state.suspended ? '結果を確認する' : state.pending ? '次の相談へ' : '続ける'}</Button> : <Button variant="primary" disabled={!chosen} onClick={() => actions.decide(selected)}>{chosen ? `${chosen.title} · 確定` : '対応を選んでください'}</Button>}</div>}>
    {receipt ? <Receipt state={state} /> : <>
      <p>{displayText(decision.text.length > 140 ? decision.text.split('。')[0] + '。' : decision.text)}</p>
      <DecisionContext state={state} decision={decision} />
      <h3>対応を選ぶ</h3>
      <div className="choice-list" role="group" aria-label="対応を選ぶ">{decision.options.map(option => {
        const immediate = isLightChoice(decision, option);
        const recruiting = ['hire', 'recruit'].includes(option.id);
        const description = recruiting ? '1人を募集。入社の目安は2〜12か月。1年活動しても採用に至らない場合があります。給与は入社後から。' : displayText(option.desc);
        return <ChoiceCard key={option.id} title={option.title} description={description} cost={option.cost ? money(option.cost) : '初期費用なし'} selected={selected === option.id} disabled={!options.some(item => item.id === option.id)} immediate={immediate} onChoose={() => {
          actions.pause();
          if (immediate) actions.decide(option.id);
          else setSelected(option.id);
        }}><details><summary>主なリスク・条件</summary><p>{displayText(option.effect)}</p>{recruiting && <p>2〜12か月の入社時期はゲーム上の仮定。年間採用計画の達成率とは別の設定です。</p>}</details></ChoiceCard>;
      })}</div>
      {discovery && <Discovery kind={discovery} state={state} />}
      {decision.text.length > 140 && <details><summary>相談の背景</summary><p>{displayText(decision.text)}</p></details>}
      {decision.initiated && <Button onClick={actions.cancelHelp}>対処をやめて元の相談へ戻る</Button>}
    </>}
  </Dialog>;
}
