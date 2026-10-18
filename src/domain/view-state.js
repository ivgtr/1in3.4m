// Derive guidance from the same state that controls playback; never store a second status.
export function progressState({ state, wanted, running, auto, reading, error, plannedTitle, blockedBy = [] }) {
  const receipt = state?.decisionReceipt;
  const held = !!state?.pending && !!state.decisionHeld && !receipt;
  const automatic = receipt ? receipt.automatic : !!state?.pending && auto && !held;
  const canStep = !!state && !state.pending && !receipt && !state.checkpoint && !state.suspended && !state.ended && !error;
  const completionLabel = receipt ? state.ended || state.suspended ? '結果を確認する' : state.pending ? '次の相談へ' : '続ける' : null;
  const interruption = blockedBy.includes('modal') ? 'メニューを表示中'
    : blockedBy.includes('route') ? '別の画面を閲覧中'
    : blockedBy.some(reason => reason.startsWith('view:')) ? '画面を読み込み中'
    : blockedBy.includes('hidden') ? '別のタブを表示中' : null;
  const toggle = { action: wanted ? 'pause' : 'play', label: wanted ? 'Ⅱ 停止' : '再開' };
  const result = (message, action = null, label = '') => ({ message, action, label, automatic, canStep, completionLabel });

  if (!state) return result('創業前');
  if (error) return result('エラーにより停止中 · 通知を確認してください', held ? 'reopen' : null, held ? '相談に戻る' : receipt ? '再開' : '▶ 再生');
  if (receipt) {
    if (!receipt.automatic) return result(state.ended || state.suspended ? '結果確認中 · 会社の振り返りへ' : state.pending ? '結果確認中 · 次の相談へ' : '結果確認中 · 続けると再開', 'finishResult', completionLabel);
    if (interruption) return result(`結果表示を一時停止 · ${interruption}`, toggle.action, toggle.label);
    return result(running ? '結果を表示中 · まもなく日常へ' : '結果表示を一時停止 · 再開できます', toggle.action, toggle.label);
  }
  if (state.ended) return result('会社の振り返り');
  if (state.suspended) return result('記録を保存して中断中');
  if (state.checkpoint) return result('節目を確認中');
  if (held) return result(reading ? '相談を保留中 · 履歴を閲覧中 · 時間は停止中' : '相談を保留中 · 時間は停止中', 'reopen', '相談に戻る');
  if (state.pending && !auto) return result('あなたの選択待ち · 選ぶまで時間は停止', null, '対応を選んでください');
  if (reading) return result('履歴を閲覧中 · 時間は停止中', 'play', '▶ 最新から再開');
  if (interruption) return result(`一時停止 · ${interruption}`, toggle.action, wanted ? toggle.label : '▶ 再生');
  if (state.pending) return result(running ? `まもなく「${plannedTitle}」を選びます` : '自動判断は一時停止 · 自分で選ぶか再開', toggle.action, toggle.label);
  return result(running ? '進行中' : '一時停止', toggle.action, wanted ? toggle.label : '▶ 再生');
}

export function historyReadIntent({ intent, top }) {
  return intent && top > 40;
}
