const DAY = 86_400_000;
const EXERCISE_ID = /^[a-z0-9][a-z0-9-]{0,80}$/;
const MAX_TEXT = 12_000;
const MAX_RECORDS = 120;
const MAX_ATTEMPTS = 20;
const INTERVALS = [1, 3, 7, 14];

const text = (value, limit = MAX_TEXT) => typeof value === 'string' ? value.slice(0, limit) : '';
const time = value => Number.isSafeInteger(value) && value >= 0 && value < 8.64e15 ? value : 0;
const integer = value => Number.isInteger(value) && value >= 0 && value <= 9999 ? value : 0;
const list = (value, limit = MAX_RECORDS) => Array.isArray(value) ? value.slice(0, limit) : [];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const record = value => isRecord(value) ? value : {};
const stringMap = value => Object.fromEntries(Object.entries(record(value)).slice(0, 30)
  .filter(([key]) => /^[a-z][a-zA-Z0-9-]{0,48}$/.test(key))
  .map(([key, item]) => [key, text(item)]));

export function newModel() {
  return { version: 1, rev: 0, diagnosis: {}, lessons: {}, works: [], applications: [], track: 'qa' };
}

function cleanDraft(input) {
  const draft = record(input);
  return {
    response: text(draft.response),
    picks: list(draft.picks, 12).map(item => Number.isInteger(item) && item >= 0 && item < 12 ? item : null),
    rubric: list(draft.rubric, 16).map(item => item === true),
    lab: stringMap(draft.lab),
    hints: integer(draft.hints),
    revealed: draft.revealed === true,
  };
}

export function emptyProgress() {
  return {
    practice: cleanDraft({}), repeat: cleanDraft({}), attempts: [], due: 0, interval: 0,
    practicePassed: false, spacedRepeatPassed: false,
  };
}

function cleanProgress(value) {
  const attempts = list(value?.attempts, MAX_ATTEMPTS).map(item => ({
    at: time(item?.at),
    mode: item?.mode === 'repeat' ? 'repeat' : 'practice',
    passed: item?.passed === true,
    independent: item?.independent === true,
    spaced: item?.spaced === true,
    response: text(item?.response),
    messages: list(item?.messages, 16).map(message => text(message, 500)),
  })).filter(item => item.at);
  const firstPractice = attempts.findLastIndex(item => item.mode === 'practice' && item.passed);
  const practicePassed = value?.practicePassed === true || firstPractice >= 0;
  const spacedRepeatPassed = practicePassed && (value?.spacedRepeatPassed === true ||
    attempts.some((item, index) => index < firstPractice && item.mode === 'repeat' && item.passed && item.independent && item.spaced));
  return {
    practice: cleanDraft(value?.practice),
    repeat: cleanDraft(value?.repeat),
    attempts,
    due: time(value?.due),
    interval: INTERVALS.includes(value?.interval) ? value.interval : 0,
    practicePassed,
    spacedRepeatPassed,
  };
}

export function cleanModel(input) {
  if (!isRecord(input) || input.version !== 1 || !isRecord(input.lessons) || !isRecord(input.diagnosis) ||
      !Array.isArray(input.works) || !Array.isArray(input.applications)) {
    throw new Error('Нужна резервная копия «Путь в IT» версии 1.');
  }
  const model = newModel();
  model.rev = time(input.rev);
  model.track = input.track === 'web' ? 'web' : 'qa';
  model.diagnosis = Object.fromEntries(Object.entries(input.diagnosis).slice(0, 30)
    .filter(([key]) => EXERCISE_ID.test(key))
    .map(([key, value]) => [key, { response: text(value?.response), level: ['new', 'guided', 'own'].includes(value?.level) ? value.level : 'new' }]));
  model.lessons = Object.fromEntries(Object.entries(input.lessons).slice(0, MAX_RECORDS)
    .filter(([key]) => EXERCISE_ID.test(key))
    .map(([key, value]) => [key, cleanProgress(value)]));
  model.works = list(input.works).map(item => ({
    id: text(item?.id, 80), lesson: text(item?.lesson, 80), at: time(item?.at),
    title: text(item?.title, 120), evidence: text(item?.evidence, 1200),
    explanation: text(item?.explanation), review: text(item?.review, 1800),
  })).filter(item => item.id && item.title && item.evidence && item.explanation);
  model.applications = list(input.applications).map(item => ({
    id: text(item?.id, 80), at: time(item?.at), company: text(item?.company, 100),
    position: text(item?.position, 140), link: text(item?.link, 1200),
    state: ['sent', 'interview', 'test', 'offer', 'closed'].includes(item?.state) ? item.state : 'sent',
    note: text(item?.note, 1800),
  })).filter(item => item.id && item.company && item.position);
  return model;
}

export function submitAttempt(progress, mode, passed, messages, now = Date.now()) {
  const draft = progress[mode];
  const independent = !draft.hints && !draft.revealed;
  const firstPass = mode === 'practice' && passed && !progress.practicePassed;
  const spaced = mode === 'repeat' && progress.practicePassed && Boolean(progress.due) && now >= progress.due;
  const result = { mode, passed, independent, spaced, at: now, response: draft.response, messages };
  if (firstPass) progress.practicePassed = true;
  if (spaced && passed && independent) progress.spacedRepeatPassed = true;
  progress.attempts.unshift(result);
  progress.attempts = progress.attempts.slice(0, MAX_ATTEMPTS);
  if (!passed || !independent || firstPass) {
    progress.interval = 1;
    progress.due = now + DAY;
  } else if (mode === 'repeat') {
    if (spaced) {
      const index = INTERVALS.indexOf(progress.interval);
      progress.interval = INTERVALS[Math.min(INTERVALS.length - 1, index + 1)];
    } else if (!progress.interval) {
      progress.interval = INTERVALS[0];
    }
    progress.due = now + progress.interval * DAY;
  }
  if (mode === 'repeat' && passed) progress.repeat = cleanDraft({});
  return result;
}

export function skillStatus(model, id) {
  const progress = model.lessons[id];
  if (!progress?.practicePassed) {
    const latest = progress?.attempts[0];
    if (!latest) return 'new';
    return latest.independent ? 'trying' : 'guided';
  }
  if (!progress.spacedRepeatPassed) return 'practice';
  const work = model.works.find(item => item.lesson === id && item.review);
  if (work) return 'reviewed';
  return model.works.some(item => item.lesson === id) ? 'applied' : 'repeat';
}

export function dueLessons(model, lessons, now = Date.now()) {
  return lessons.filter(item => model.lessons[item.id]?.due > 0 && model.lessons[item.id].due <= now)
    .sort((a, b) => model.lessons[a.id].due - model.lessons[b.id].due);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('qa-web-learning', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('progress');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Закрой другие вкладки приложения и обнови страницу.'));
  });
}

export async function loadModel() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('progress').objectStore('progress').get('model');
      req.onsuccess = () => {
        try { resolve(req.result ? cleanModel(req.result) : newModel()); }
        catch (error) { reject(error); }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function persistModel(snapshot, expectedRevision) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('progress', 'readwrite');
      const store = tx.objectStore('progress');
      const req = store.get('model');
      let conflict = false;
      const next = expectedRevision + 1;
      req.onsuccess = () => {
        if ((req.result?.rev ?? 0) !== expectedRevision) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put({ ...snapshot, rev: next }, 'model');
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = () => reject(conflict
        ? new Error('В другой вкладке появилась новая версия. Экспортируй текущие ответы и обнови страницу.')
        : tx.error ?? new Error('Не удалось сохранить изменения.'));
    });
  } finally {
    db.close();
  }
}
