import { activeClients, autoDecision, availableDecisionOptions, previewAutoChoice, registerDecision, restore, staff } from '../domain/model.js';
import { isLightChoice, decisionOutcomes } from '../domain/interaction.js';
import { changedSchedules } from '../domain/schedules.js';

const num = value => Math.round(value).toLocaleString('ja-JP');
const dateAt = m => m ? `${Math.floor((m - 1) / 12) + 1}年目 ${(m - 1) % 12 + 1}月末` : '創業の日';

// Current saves retain the exact simulation and random streams. No upgrade or recovery path.
export function readCompany(raw) {
  const state = restore(raw);
  if (state.life?.version !== 2 || !state.timelineVersion) {
    throw new Error('この記録は現在の会社の形式ではありません。保存データは変更していません。');
  }
  return state;
}

// A receipt is derived only from committed model changes. Presentation never consumes RNG.
export function choose(state, choiceId, mode, automatic = false) {
  if (state.decisionReceipt || !state.pending) throw new Error('判断待ちの相談がありません。');
  const options = availableDecisionOptions(state);
  const picked = automatic ? previewAutoChoice(state, mode).id : choiceId;
  const next = automatic ? autoDecision(state, mode) : registerDecision(state, choiceId);
  const option = options.find(item => item.id === picked);
  delete next.decisionHeld;
  delete next.helpReturnUi;
  if (picked === 'dismiss') return { state: next, notice: '相談を確認しました。会社の経営へ戻ります。' };
  if (isLightChoice(state.pending, option)) return { state: next, notice: `返答を記録しました：${option.title}` };
  const events = next.events.filter(event => !state.events.some(old => old.id === event.id));
  const changes = [];
  for (const [label, before, after, unit] of [
    ['手元資金', state.cash, next.cash, '万円'], ['借入残高', state.debt, next.debt, '万円'],
    ['社員', staff(state), staff(next), '人'], ['顧客', activeClients(state).length, activeClients(next).length, '社'],
  ]) {
    if (before !== after) changes.push(`${label}：${num(before)} → ${num(after)}${unit}`);
  }
  next.decisionReceipt = {
    eventId: events.at(-1).id,
    month: next.calendarMonth,
    title: state.pending.title,
    action: option.title,
    automatic,
    changes,
    outcomes: decisionOutcomes(state, next).map(line => line.replace(/（[\d,.]+ → [\d,.]+ \/ 100）/g, '')),
    events,
    future: changedSchedules(state, next).map(row => `${row.label}：${dateAt(row.month)}`),
  };
  return { state: next, notice: '' };
}
