export const num = value => Math.round(value).toLocaleString('ja-JP');
export const money = value => `${num(value)}万円`;
export const dateAt = month => month === 0
  ? '創業の日'
  : `${Math.floor((month - 1) / 12) + 1}年目 ${(month - 1) % 12 + 1}月末`;
export const monthNow = state => state.calendarMonth;

// Preserve the recorded story while keeping model precision out of its presentation.
export const displayText = value => value
  .replace(/([−-]?[\d,]+(?:\.\d+)?) → ([−-]?[\d,]+(?:\.\d+)?)万円/g, (_, before, after) => `${num(Number(before.replaceAll(',', '').replace('−', '-')))} → ${money(Number(after.replaceAll(',', '').replace('−', '-')))}`)
  .replace(/(-?\d+(?:\.\d+)?)万円/g, (_, amount) => money(Number(amount)))
  .replace(/本人の負担が\d+(?:\.\d+)?\/100まで高まり/g, '本人の負担が強まり')
  .replace(/本人の負担\s*[−-]\d+(?:\.\d+)?。/g, '本人の負担を軽くする。')
  .replace(/処理倍率\s*\+0\.10、疲労を軽減/g, '仕事を進める力を高め、負担を軽減')
  .replace(/処理倍率\s*\+0\.05、疲労\s*\+12/g, '仕事を進める力が増す一方、社長の負担も増える');
