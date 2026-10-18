import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createEncounter } from '../../src/domain/encounter.js';
import { autoDecision, continueLife, evolveCompany, prepareTimeline, registerDecision, requestExit, requestHelp, startLife, tickMonth } from '../../src/domain/model.js';
import { SAVE_KEY, PREFS_KEY } from '../../src/game/session-storage.js';

const config = JSON.parse(readFileSync(new URL('../../src/domain/model-data.json', import.meta.url)));
const company = prepareTimeline(evolveCompany(startLife(createEncounter(7, '読み込み試験会社', config, 'builders'))));
const saved = JSON.stringify(company);
const feature = name => new RegExp(`/assets/${name}-[^/]+\\.js$`);
const readSave = page => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);

async function seed(page, raw = saved, auto = 'manual') {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '始める', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '始める', exact: true })).toHaveCSS('font-weight', '700');
  await expect(page.getByRole('button', { name: '始める', exact: true })).toHaveCSS('height', '44px');
  await page.evaluate(({ raw, auto, saveKey, prefsKey }) => {
    localStorage.setItem(saveKey, raw);
    localStorage.setItem(prefsKey, JSON.stringify({ speed: 2, auto }));
  }, { raw, auto, saveKey: SAVE_KEY, prefsKey: PREFS_KEY });
}

function fiveYearCompany() {
  let mature = prepareTimeline(evolveCompany(startLife(createEncounter(1, '五年の会社', config))));
  for (let turns = 0; mature.calendarMonth < 60 && !mature.ended && turns < 500; turns++) {
    mature = mature.pending ? autoDecision(mature, 'all') : mature.checkpoint ? continueLife(mature) : tickMonth(mature);
  }
  expect(mature.calendarMonth).toBe(60);
  mature = continueLife(mature);
  return mature;
}

test('cold routes defer the runtime; start, hold, navigation and reload preserve one company', async ({ page }) => {
  await page.addInitScript(() => { crypto.getRandomValues = array => array.fill(2); });
  const scripts = [];
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '始める', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'データと遊び方' }).click();
  await expect(page.getByRole('heading', { name: '見守り、ときどき決める', level: 1 })).toBeVisible();
  expect(scripts.some(url => feature('GameRuntime').test(url))).toBe(false);
  await page.goto('/');
  await page.getByRole('button', { name: '始める', exact: true }).click();
  await expect(page.getByRole('heading', { name: '今回は、どう見守る？' })).toBeVisible();
  expect(await readSave(page)).toBeNull();
  expect(scripts.some(url => feature('GameRuntime').test(url))).toBe(true);
  await page.getByRole('button', { name: '自分で決めながら始める' }).click();
  await page.getByRole('button', { name: 'いったん畳んで会社を見る' }).click();
  const before = await readSave(page);
  await page.getByRole('link', { name: 'すべての記録を読む' }).click();
  await expect(page.getByRole('heading', { name: 'この会社が、歩いてきたこと' })).toBeVisible();
  await page.getByRole('link', { name: 'データと遊び方' }).click();
  await expect(page.getByRole('heading', { name: '見守り、ときどき決める', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '会社のこと', exact: true })).toBeVisible();
  expect(await readSave(page)).toBe(before);
});

test('runtime download failure shows a startup error without replacing the save', async ({ page }) => {
  await seed(page);
  await page.route(feature('GameRuntime'), route => route.abort());
  await page.reload();
  await expect(page.getByText(/ゲームを読み込めません/)).toBeVisible();
  expect(await readSave(page)).toBe(saved);
});

test('invalid saved data is reported without a new company or fallback write', async ({ page }) => {
  await seed(page, '{broken');
  await page.reload();
  await expect(page.getByText(/保存データを読み込めません/)).toBeVisible();
  expect(await readSave(page)).toBe('{broken');
  await expect(page.getByRole('button', { name: '始める', exact: true })).toHaveCount(0);
});

test('automatic decisions wait until both the diary and the decision view have loaded', async ({ page }) => {
  await seed(page, saved, 'all');
  await page.clock.install();
  let releaseDecision, releaseDiary;
  const decisionGate = new Promise(resolve => { releaseDecision = resolve; });
  const diaryGate = new Promise(resolve => { releaseDiary = resolve; });
  await page.route(feature('DecisionFlow'), async route => { await decisionGate; await route.continue(); });
  await page.route(feature('ObservePage'), async route => { await diaryGate; await route.continue(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('相談・結果を読み込み中…')).toBeVisible();
  await page.getByRole('button', { name: '▶ 再生', exact: true }).click();
  await page.clock.runFor(10_000);
  expect(await readSave(page)).toBe(saved);
  releaseDecision();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.runFor(10_000);
  expect(await readSave(page)).toBe(saved);
  releaseDiary();
  await expect(page.getByText('会社の日誌を読み込み中…')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'すべての記録を読む', includeHidden: true })).toBeAttached();
  await page.clock.runFor(6_100);
  expect(await readSave(page)).not.toBe(saved);
});

test('failed decision chunks pause and notify once; returning to the company keeps the decision', async ({ page }) => {
  await seed(page, saved, 'all');
  await page.clock.install();
  await page.route(feature('DecisionFlow'), route => route.abort());
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByText(/相談・結果を表示できません/)).toBeVisible();
  await page.clock.runFor(10_000);
  expect(await readSave(page)).toBe(saved);
  await page.getByRole('button', { name: '会社へ戻る', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(1);
  const held = JSON.parse(await readSave(page));
  expect(held).toEqual({ ...company, decisionHeld: true });
});

test('a nested menu failure can be closed on a narrow screen with focus restored', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, JSON.stringify({ ...company, decisionHeld: true }));
  await page.route(feature('People'), route => route.abort());
  await page.reload();
  const menuButton = page.getByRole('button', { name: '会社のこと', exact: true });
  await menuButton.click();
  const menu = page.getByRole('dialog', { name: '会社のこと', exact: true });
  await menu.getByRole('button', { name: '人と取引', exact: true }).click();
  const people = page.getByRole('dialog', { name: 'この会社と、縁のある人たち' });
  await expect(people.getByRole('alert')).toHaveCount(1);
  await expect(people.getByText(/人と取引を表示できません/)).toBeVisible();
  const box = await people.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await people.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(menu.getByRole('button', { name: '人と取引', exact: true })).toBeFocused();
  await menu.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(menuButton).toBeFocused();
  expect(await readSave(page)).toBe(JSON.stringify({ ...company, decisionHeld: true }));
});

test('five-year diary, feature menus and the final record load through their production boundaries', async ({ page }) => {
  const mature = fiveYearCompany();
  await seed(page, JSON.stringify(mature));
  await page.reload();
  await expect(page.getByRole('heading', { name: '会社の日誌', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '会社のこと', exact: true }).click();
  const menu = page.getByRole('dialog', { name: '会社のこと', exact: true });
  for (const [button, title, content] of [
    ['人と取引', 'この会社と、縁のある人たち', '別の道へ進んだ仲間'],
    ['歴代経営者と業績', '経営者の時代と会社の経過', '会社と、歴代の経営者'],
    ['データと遊び方', '実測・推計・仮定の境界', '見守り、ときどき決める'],
  ]) {
    await menu.getByRole('button', { name: button, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: title });
    await expect(dialog.getByRole('heading', { name: content, exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  }
  expect(await readSave(page)).toBe(JSON.stringify(mature));
  const ended = registerDecision(requestExit(mature), 'voluntary');
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVE_KEY, raw: JSON.stringify(ended) });
  await page.reload();
  await expect(page.getByRole('heading', { name: '自主廃業を選び、会社を閉じた。' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '創業からの全日誌' })).toBeVisible();
  expect(await readSave(page)).toBe(JSON.stringify(ended));
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 667 }]) {
  test(`reading guidance preserves the diary and prioritizes a held decision at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const held = { ...requestHelp(fiveYearCompany(), 'workload'), decisionHeld: true };
    const raw = JSON.stringify(held);
    await seed(page, raw);
    await page.reload();
    const controls = page.getByRole('region', { name: '時間と見守り方' });
    const feed = page.getByLabel('直近5年分の会社の日誌・新しい月から', { exact: true });
    const latest = page.getByRole('button', { name: '最新へ戻る', exact: true });
    await expect(latest).toBeDisabled();
    const originalTop = await feed.evaluate(node => node.getBoundingClientRect().top + window.scrollY);
    await feed.focus();
    await feed.press('PageDown');
    await expect.poll(() => feed.evaluate(node => node.scrollTop)).toBeGreaterThan(40);
    await expect(controls.getByRole('status')).toHaveText('相談を保留中 · 履歴を閲覧中 · 時間は停止中');
    await expect(page.getByRole('button', { name: '相談に戻る', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: '▶ 最新から再開', exact: true })).toHaveCount(0);
    expect(await feed.evaluate(node => node.getBoundingClientRect().top + window.scrollY)).toBe(originalTop);
    expect(await readSave(page)).toBe(raw);
    await latest.click();
    await expect.poll(() => feed.evaluate(node => node.scrollTop)).toBe(0);
    await expect(controls.getByRole('status')).toHaveText('相談を保留中 · 時間は停止中');
    await expect(latest).toBeDisabled();
    expect(await readSave(page)).toBe(raw);
    await controls.getByRole('button', { name: '相談に戻る', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText('あなたの選択待ち · 選ぶまで時間は停止');
    await page.screenshot({ path: testInfo.outputPath('held-decision.png') });

    // Without a held decision, returning to latest stays paused; resuming clears reading.
    const ordinary = fiveYearCompany();
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVE_KEY, raw: JSON.stringify(ordinary) });
    await page.reload();
    await expect(feed).toBeVisible();
    await feed.focus();
    await feed.press('PageDown');
    await expect(controls.getByRole('status')).toHaveText('履歴を閲覧中 · 時間は停止中');
    await latest.click();
    await expect(controls.getByRole('status')).toHaveText('一時停止');
    await feed.focus();
    await feed.press('PageDown');
    await controls.getByRole('button', { name: '▶ 最新から再開', exact: true }).click();
    await expect(controls.getByRole('status')).toHaveText('進行中');
    await expect(latest).toBeDisabled();
    await expect.poll(() => feed.evaluate(node => node.scrollTop)).toBe(0);
    await controls.getByRole('button', { name: 'Ⅱ 停止', exact: true }).click();
    await expect(controls.getByRole('status')).toHaveText('一時停止');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('diary-controls.png'), fullPage: true });
  });

  test(`notifications stay visible outside scrolling content at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page);
    await page.reload();
    await page.getByRole('button', { name: 'いったん畳んで会社を見る' }).click();
    const heading = page.getByRole('link', { name: 'すべての記録を読む' });
    const before = await heading.boundingBox();
    await page.evaluate(() => localStorage.setItem('company-life-archives-v1', '{'));
    await page.getByRole('button', { name: '会社のこと', exact: true }).click();
    await page.getByRole('button', { name: '保存した会社', exact: true }).click();
    const archives = page.getByRole('dialog', { name: '保存した会社', exact: true });
    await expect(archives.getByRole('alert')).toBeVisible();
    await archives.getByRole('button', { name: '閉じる', exact: true }).click();
    const menu = page.getByRole('dialog', { name: '会社のこと', exact: true });
    const alert = menu.getByRole('alert');
    const position = await alert.boundingBox();
    await menu.getByRole('button', { name: '保存した会社', exact: true }).scrollIntoViewIfNeeded();
    await expect(alert).toBeInViewport();
    expect((await alert.boundingBox()).y).toBe(position.y);
    await menu.getByRole('button', { name: '閉じる', exact: true }).click();
    expect((await heading.boundingBox()).y).toBe(before.y);
    const floating = page.getByRole('alert');
    await expect(floating).toBeInViewport();
    const box = await floating.boundingBox();
    expect(box.y).toBeGreaterThan(viewport.height / 2);
    if (viewport.width > 700) expect(box.x).toBeGreaterThan(viewport.width / 2);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(floating).toBeInViewport();
    expect((await floating.boundingBox()).y).toBe(box.y);
    await page.getByRole('region', { name: '時間と見守り方' }).getByRole('button', { name: '相談に戻る', exact: true }).click();
    const decision = page.getByRole('dialog');
    await expect(decision.getByRole('alert')).toBeInViewport();
    const decisionPosition = await decision.getByRole('alert').boundingBox();
    await decision.getByRole('group', { name: '対応を選ぶ' }).locator('button').last().scrollIntoViewIfNeeded();
    expect((await decision.getByRole('alert').boundingBox()).y).toBe(decisionPosition.y);
    await expect(decision.getByRole('button', { name: '対応を選んでください', exact: true })).toBeInViewport();
    await decision.getByRole('button', { name: '通知を閉じる' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);

    // An error while ordinary playback is stopped must not move the diary either.
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVE_KEY, raw: JSON.stringify(fiveYearCompany()) });
    await page.reload();
    const diaryHeading = page.getByRole('heading', { name: '会社の日誌', exact: true });
    await expect(diaryHeading).toBeVisible();
    const diaryTop = await diaryHeading.evaluate(node => node.getBoundingClientRect().top + window.scrollY);
    await page.getByRole('button', { name: '会社のこと', exact: true }).click();
    await page.getByRole('button', { name: '保存した会社', exact: true }).click();
    await expect(archives.getByRole('alert')).toBeVisible();
    await archives.getByRole('button', { name: '閉じる', exact: true }).click();
    await menu.getByRole('button', { name: '閉じる', exact: true }).click();
    await expect(page.getByRole('button', { name: '▶ 再生', exact: true })).toBeDisabled();
    expect(await diaryHeading.evaluate(node => node.getBoundingClientRect().top + window.scrollY)).toBe(diaryTop);
    await page.getByRole('button', { name: '通知を閉じる' }).click();
    await expect(page.getByRole('button', { name: '▶ 再生', exact: true })).toBeEnabled();
  });
}
