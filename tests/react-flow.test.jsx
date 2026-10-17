import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { createEncounter } from '../src/domain/encounter.js';
import { prepareTimeline, evolveCompany, startLife, requestHelp } from '../src/domain/model.js';
import { readCompany, SAVE_KEY, PREFS_KEY } from '../src/game/session.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'localStorage', 'MutationObserver']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = callback => setTimeout(callback, 16);
globalThis.cancelAnimationFrame = clearTimeout;
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new dom.window.Event('close')); };
const { render, fireEvent, screen, cleanup, act } = await import('@testing-library/react');
const { GameProvider, useGame } = await import('../src/game/GameProvider.jsx');
const { DecisionFlow } = await import('../src/components/DecisionFlow.jsx');
const { SpeedControls } = await import('../src/components/ui.jsx');
const config = JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json', import.meta.url)));
const fresh = () => prepareTimeline(evolveCompany(startLife(createEncounter(7, '試験会社', config, 'builders'))));
let game;
function Probe() {
  game = useGame();
  return <><button onClick={game.actions.play}>時計を再生</button><SpeedControls speed={game.preferences.speed} onChange={speed => game.actions.changePreferences({ speed })} /><DecisionFlow /></>;
}
function mount(state = fresh(), auto = 'manual') {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  localStorage.setItem(PREFS_KEY, JSON.stringify({ speed: .25, auto }));
  return render(<GameProvider><Probe /></GameProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); });

test('現在の保存を停止状態で復元し、軽い返答を一度で保存する', () => {
  const original = fresh();
  mount(original);
  assert.equal(game.clock.wanted, false);
  assert.deepEqual(game.state, readCompany(JSON.stringify(original)));
  fireEvent.click(screen.getByRole('button', { name: /今回は見送り/ }));
  assert.equal(game.state.calendarMonth, original.calendarMonth);
  assert.equal(game.state.decisions.length, original.decisions.length + 1);
  assert.equal(game.state.decisionReceipt, undefined);
  assert.equal(document.querySelector('dialog'), null);
  assert.deepEqual(readCompany(localStorage.getItem(SAVE_KEY)), game.state);
  const saved = localStorage.getItem(SAVE_KEY);
  cleanup();
  mount(readCompany(saved));
  assert.equal(game.clock.wanted, false);
  assert.equal(game.state.rng, readCompany(saved).rng);
});

test('自動相談への介入で即座に再開表示となり、重大な選択は確定まで状態を変えない', () => {
  mount(fresh(), 'safe');
  fireEvent.click(screen.getByRole('button', { name: '時計を再生' }));
  assert.equal(game.clock.running, true);
  const body = document.querySelector('.dialog-body');
  fireEvent.pointerDown(body);
  assert.equal(game.clock.running, false);
  const resume = screen.getByRole('button', { name: '再開' });
  fireEvent.click(resume);
  assert.equal(game.clock.running, true);
  const before = JSON.stringify(game.state);
  fireEvent.click(screen.getByRole('button', { name: /試作.*初期費用なし|試作.*万円/ }));
  assert.equal(game.clock.running, false);
  assert.equal(JSON.stringify(game.state), before);
  fireEvent.click(screen.getByRole('button', { name: /· 確定$/ }));
  assert.ok(game.state.decisionReceipt);
  assert.equal(game.state.calendarMonth, JSON.parse(before).calendarMonth);
  assert.equal(game.clock.running, false);
  fireEvent.click(screen.getByRole('button', { name: '続ける' }));
  assert.equal(game.state.decisionReceipt, undefined);
});

test('採用の人数・時期を表示し、同じ速度部品は保存値に追従する', () => {
  const state = fresh();
  state.pending = null;
  mount(requestHelp(state, 'workload'));
  assert.ok(screen.getByText(/1人を募集。入社の目安は2〜12か月。/));
  fireEvent.click(screen.getByRole('button', { name: '時間の速さ 4倍' }));
  assert.equal(JSON.parse(localStorage.getItem(PREFS_KEY)).speed, 1);
  assert.equal(screen.getByRole('button', { name: '時間の速さ 4倍' }).getAttribute('aria-pressed'), 'true');
  const raw = JSON.stringify(game.state);
  const rng = game.state.rng;
  act(() => { game.actions.pause(); });
  assert.equal(JSON.stringify(game.state), raw);
  assert.equal(game.state.rng, rng);
});

test('保留した相談から対処を開け、記録を増やさない確認と自動終了の結果を完了できる', async () => {
  const { currentLeader, requestExit } = await import('../src/domain/model.js');
  mount();
  act(() => game.actions.hold());
  assert.equal(document.querySelector('dialog').open, false);
  act(() => game.actions.help('workload'));
  assert.equal(game.state.pending.type, 'workload');
  assert.equal(game.state.decisionHeld, undefined);
  assert.equal(document.querySelector('dialog').open, true);
  cleanup();

  const stale = fresh();
  currentLeader(stale).personId = stale.people[0].id;
  stale.pending = { id: 'role-changed', type: 'team', at: stale.q + 1, entityId: stale.people[0].id, options: [{ id: 'release', cost: 45 }], causes: [] };
  for (const automatic of [false, true]) {
    const { choose } = await import('../src/game/session.js');
    const restored = readCompany(JSON.stringify(stale));
    const result = choose(restored, 'dismiss', 'all', automatic);
    assert.equal(result.state.pending, null);
    assert.equal(result.state.decisions.length, stale.decisions.length);
    assert.equal(result.state.events.length, stale.events.length);
    assert.equal(result.state.decisionReceipt, undefined);
  }

  const closing = prepareTimeline(evolveCompany(startLife(createEncounter(3, '自動終了', config, 'independent'))));
  mount(requestExit(closing), 'all');
  fireEvent.click(screen.getByRole('button', { name: '時計を再生' }));
  act(() => game.actions.decide(undefined, true));
  assert.equal(game.state.ended, 'voluntary');
  assert.equal(game.state.decisionReceipt.automatic, true);
  assert.equal(game.clock.running, true, '終了結果を表示するタイマーは月進行と別に動く');
  act(() => game.actions.finishResult());
  assert.equal(game.state.decisionReceipt, undefined);
  assert.equal(game.clock.running, false);
});
