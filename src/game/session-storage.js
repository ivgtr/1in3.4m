export const SAVE_KEY = 'company-life-save-v3';
export const PREFS_KEY = 'company-life-preferences-v1';
export const ARCHIVES_KEY = 'company-life-archives-v1';
export const SPEEDS = [.125, .25, .5, 1, 2];
export const AUTO_LABELS = { manual: '自分で決める', safe: '重要判断は確認', all: 'すべておまかせ' };

export function readPreferences(raw) {
  if (raw === null) return { speed: .25, auto: 'manual' };
  const preferences = JSON.parse(raw);
  if (!SPEEDS.includes(preferences.speed) || !Object.hasOwn(AUTO_LABELS, preferences.auto)) {
    throw new Error('速度・見守り方の保存形式が不正です。保存データは変更していません。');
  }
  return preferences;
}

export function readArchives(storage) {
  const raw = storage.getItem(ARCHIVES_KEY);
  if (raw === null) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('保存した会社の一覧を読み込めません。');
  return rows;
}

export function archiveCompany(storage, state) {
  const rows = readArchives(storage);
  const raw = JSON.stringify(state);
  if (!rows.some(row => row.raw === raw)) {
    rows.push({ id: `${Date.now()}-${rows.length}`, name: state.name, month: state.calendarMonth, raw });
    storage.setItem(ARCHIVES_KEY, JSON.stringify(rows));
  }
}

export function readStartup(storage) {
  return {
    rawCompany: storage.getItem(SAVE_KEY),
    preferences: readPreferences(storage.getItem(PREFS_KEY)),
  };
}
