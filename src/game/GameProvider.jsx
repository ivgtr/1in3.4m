import React, { useEffect, useMemo, useRef, useState } from 'react';
import config from '../domain/model-data.json';
import { createEncounter } from '../domain/encounter.js';
import { Playback, displayDelay } from '../domain/playback.js';
import {
  autoCanChoose, cancelHelp, contactCandidate, continueLife, evolveCompany, prepareTimeline,
  previewAutoChoice, registerFamily, requestExit, requestHelp, requestLeadership, requestStrategy, setPolicy, startLife, tickMonth,
} from '../domain/model.js';
import { choose, readCompany } from './session.js';
import { archiveCompany, PREFS_KEY, readArchives, readPreferences, readStartup, SAVE_KEY } from './session-storage.js';
import { progressState } from '../domain/view-state.js';
import { GameContext } from './GameContext.jsx';

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const autoReady = (state, mode) => autoCanChoose(state, mode) && !state.pending.initiated;

function readSession(startup, intent) {
  try {
    const snapshot = startup ?? readStartup(localStorage);
    return {
      state: snapshot.rawCompany === null ? null : readCompany(snapshot.rawCompany),
      preferences: snapshot.preferences,
      draft: intent === 'encounter' ? createEncounter(randomSeed(), null, config) : null,
      dialogs: intent === 'archives' ? [{ kind: 'archives' }] : [],
      error: null,
    };
  } catch (error) {
    return { error: `保存データを読み込めません。${error.message}` };
  }
}

export function GameProvider({ children, startup, intent = 'resume' }) {
  const [initial] = useState(() => readSession(startup, intent));
  const [state, setState] = useState(initial.state);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [notification, setNotification] = useState(null);
  const error = notification?.kind === 'error';
  const [draft, setDraft] = useState(initial.draft);
  const [dialogs, setDialogs] = useState(initial.dialogs ?? []);
  const [reading, setReading] = useState(false);
  const [routePaused, setRoutePaused] = useState(false);
  const [, refreshClock] = useState(0);
  const stateRef = useRef(state);
  const preferencesRef = useRef(preferences);
  const tickRef = useRef(null);
  const clockRef = useRef(null);
  if (!clockRef.current) {
    clockRef.current = new Playback({
      tick: () => tickRef.current(),
      delay: speed => stateRef.current?.decisionReceipt ? 5000 : stateRef.current?.pending ? 6000 : displayDelay(stateRef.current, speed),
      onChange: () => refreshClock(value => value + 1),
    });
    if (preferences) clockRef.current.speed = preferences.speed;
  }
  const clock = clockRef.current;

  function sync(next = stateRef.current, prefs = preferencesRef.current, modalOpen = dialogs.length > 0) {
    clock.block('inactive', !next || !!error || (!next.decisionReceipt && (!!next.ended || !!next.suspended || (!!next.checkpoint && prefs.auto === 'manual'))));
    clock.block('decision', !next?.decisionReceipt && !!next?.pending && !autoReady(next, prefs.auto));
    clock.block('receipt', !!next?.decisionReceipt && !next.decisionReceipt.automatic);
    clock.block('held', !next?.decisionReceipt && !!next?.decisionHeld && !!next.pending);
    clock.block('modal', modalOpen);
    clock.block('route', routePaused);
  }

  function notify(kind, message) {
    if (kind === 'error') clock.pause();
    setNotification(current => {
      if (current?.kind === 'error' && kind !== 'error') return current;
      if (current?.kind === kind && current.message === message) return current;
      return { kind, message };
    });
  }

  function fail(problem) {
    notify('error', `進行を止めました。${problem.message}`);
  }

  function commit(next, nextNotice = '') {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    const before = stateRef.current;
    stateRef.current = next;
    setState(next);
    if (nextNotice) notify('info', nextNotice);
    sync(next);
    if (before?.pending?.id !== next.pending?.id || before?.decisionReceipt !== next.decisionReceipt) clock.restart();
  }

  function run(operation) {
    try { operation(); } catch (problem) { fail(problem); }
  }

  function transition(operation) {
    run(() => commit(operation(stateRef.current)));
  }

  function changePreferences(patch) {
    run(() => {
      const next = readPreferences(JSON.stringify({ ...preferencesRef.current, ...patch }));
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      preferencesRef.current = next;
      setPreferences(next);
      if ('speed' in patch) clock.setSpeed(next.speed);
      sync(stateRef.current, next);
      if ('auto' in patch) clock.restart();
    });
  }

  function finishResult() {
    const current = stateRef.current;
    if (!current?.decisionReceipt) return;
    const next = { ...current };
    delete next.decisionReceipt;
    commit(next);
    setReading(false);
    clock.restart();
    if (!next.ended && !next.suspended) clock.play();
  }

  function decide(choiceId, automatic = false) {
    const current = stateRef.current;
    if (!current?.pending || current.decisionReceipt) return;
    run(() => {
      const result = choose(current, choiceId, preferencesRef.current.auto, automatic);
      commit(result.state, result.notice);
      setReading(false);
      clock.restart();
      if (result.notice && !result.state.ended && !result.state.suspended) clock.play();
    });
  }

  tickRef.current = () => run(() => {
    const current = stateRef.current;
    if (!current || document.hidden) return;
    if (current.decisionReceipt) {
      if (current.decisionReceipt.automatic) finishResult();
    } else if (current.pending) {
      if (autoReady(current, preferencesRef.current.auto)) decide(undefined, true);
    } else if (current.checkpoint) {
      if (preferencesRef.current.auto !== 'manual') commit(continueLife(current));
    } else commit(tickMonth(current));
  });

  useEffect(() => { sync(); }, [state, preferences, dialogs.length, routePaused, error]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) clock.pause();
      clock.block('hidden', document.hidden);
    };
    const pause = () => clock.pause();
    visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pause);
      clock.dispose();
    };
  }, [clock]);

  function closeDialogs() {
    setDialogs([]);
    clock.block('modal', false);
  }
  function intervention(operation) {
    clock.pause();
    closeDialogs();
    transition(operation);
  }
  const actions = {
    changePreferences,
    pause: () => clock.pause(),
    play: () => { setReading(false); clock.play(); },
    markReading: () => { setReading(true); clock.pause(); },
    latest: () => setReading(false),
    setRoutePaused,
    open: (kind, extra = {}) => { clock.block('modal', true); setDialogs(old => [...old, { kind, ...extra }]); },
    dismiss: () => setDialogs(old => old.slice(0, -1)),
    closeDialogs,
    notify,
    dismissNotification: () => {
      if (error) clock.pause();
      setNotification(null);
    },
    encounter: () => run(() => setDraft(createEncounter(randomSeed(), null, config))),
    begin: () => run(() => {
      const next = prepareTimeline(evolveCompany(startLife(draft)));
      next.ui = { phase: 'observe', month: 0 };
      commit(next);
      setDraft(null);
      setReading(false);
      clock.restart();
      clock.play();
    }),
    decide,
    finishResult: () => run(finishResult),
    step: () => {
      const current = stateRef.current;
      if (!current || current.pending || current.decisionReceipt || current.ended || current.suspended || current.checkpoint) return;
      clock.pause();
      transition(tickMonth);
      clock.restart();
    },
    hold: () => transition(current => ({ ...current, decisionHeld: true })),
    reopen: () => transition(current => ({ ...current, decisionHeld: false })),
    help: id => intervention(current => {
      const next = requestHelp(current, id);
      delete next.decisionHeld;
      return next;
    }),
    cancelHelp: () => transition(cancelHelp),
    leadership: () => intervention(requestLeadership),
    strategy: () => intervention(requestStrategy),
    exit: () => intervention(requestExit),
    family: name => intervention(current => registerFamily(current, name)),
    policy: id => intervention(current => setPolicy(current, id)),
    contact: id => intervention(current => contactCandidate(current, id)),
    continue: () => run(() => { closeDialogs(); commit(continueLife(stateRef.current)); clock.play(); }),
    newCompany: () => run(() => {
      clock.pause();
      archiveCompany(localStorage, stateRef.current);
      localStorage.removeItem(SAVE_KEY);
      stateRef.current = null;
      setState(null);
      setReading(false);
      setDraft(createEncounter(randomSeed(), null, config));
      setNotification(null);
      closeDialogs();
      sync(null);
    }),
    loadArchive: id => run(() => {
      const row = readArchives(localStorage).find(item => item.id === id);
      if (!row) throw new Error('保存した会社が見つかりません。');
      const next = readCompany(row.raw);
      if (stateRef.current) archiveCompany(localStorage, stateRef.current);
      clock.pause();
      commit(next);
      setReading(false);
      setDraft(null);
      closeDialogs();
    }),
  };

  const ready = !!state && !!preferences && autoReady(state, preferences.auto);
  const plannedTitle = useMemo(() => ready && !state.decisionReceipt && !state.decisionHeld
    ? previewAutoChoice(state, preferences.auto).title : undefined, [ready, state, preferences?.auto]);
  const progress = progressState({
    state, wanted: clock.wanted, running: clock.running, auto: ready, reading, error,
    plannedTitle, blockedBy: [...clock.blocks],
  });
  return <GameContext.Provider value={{ state, draft, preferences, initialError: initial.error, notification, reading, dialogs, actions, clock, progress }}>{children}</GameContext.Provider>;
}
