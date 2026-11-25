import { diagnostics, lessonById } from './course.mjs';
import { labs } from './practice.mjs';
import { cleanModel, emptyProgress, loadModel, newModel, persistModel, submitAttempt } from './state.mjs';
import {
  APPLICATIONS, LEVELS, careerView, dataView, diagnosisView, esc, lessonView, navHTML,
  projectView, renderResult, repeatView, resourceView, routeView, todayView,
} from './views.mjs';

const main = document.querySelector('#main');
const nav = document.querySelector('#nav');
const status = document.querySelector('#save-status');
const toast = document.querySelector('#toast');
const breadcrumb = document.querySelector('#breadcrumb');
const latestLab = new Map();
const latestAttempt = new Map();
let model = newModel();
let imported = null;
let storage = 'Прогресс сохраняется на этом устройстве.';
let queue = Promise.resolve();
let autosaveTimer;
let toastTimer;
let inputIsDirty = false;
let otherFormDirty = false;
const MAX_BACKUP_BYTES = 64 * 1024 * 1024;

function tell(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

function storageLabel(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
  storage = message;
}

function scheduleSave() {
  inputIsDirty = true;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { void save(); }, 320);
}

function save() {
  clearTimeout(autosaveTimer);
  inputIsDirty = false;
  queue = queue.then(async () => {
    try {
      const revision = await persistModel(structuredClone(model), model.rev);
      model.rev = revision;
      storageLabel('Прогресс сохранён');
      return true;
    } catch (error) {
      storageLabel('Сохранение не удалось. Скачай копию в разделе «Данные».', true);
      tell(error?.message || 'Прогресс остался в открытой вкладке. Скачай копию.');
      return false;
    }
  });
  return queue;
}

function parts() {
  try {
    return (location.hash.slice(1) || 'today').split('/').map(decodeURIComponent);
  } catch {
    return ['today'];
  }
}

function go(route) {
  const target = '#' + route;
  if (location.hash !== target) location.hash = target;
  else render();
}

function render(moveFocus = false) {
  const [page, id, subpage] = parts();
  let view;
  let selected = page;
  let label;
  switch (page) {
    case 'route': view = routeView(model, id); label = 'Маршрут'; break;
    case 'diagnosis': view = diagnosisView(model, id); selected = 'today'; label = 'Диагностика'; break;
    case 'lesson': {
      const lesson = lessonById.get(id);
      if (!lesson) {
        view = routeView(model);
        selected = 'route';
        label = 'Маршрут';
        break;
      }
      const mode = subpage === 'repeat' ? 'repeat' : 'practice';
      view = lessonView(model, lesson, mode, {
        lab: latestLab.get(`${id}/${mode}`),
        attempt: latestAttempt.get(`${id}/${mode}`),
      });
      selected = mode === 'repeat' ? 'repeat' : 'route';
      label = lesson.title;
      break;
    }
    case 'repeat': view = repeatView(model); label = 'Повторение'; break;
    case 'project': view = projectView(model, id); label = 'Проект'; break;
    case 'career': view = careerView(model); label = 'Карьера'; break;
    case 'data': view = dataView(model, storage, imported); label = 'Данные'; break;
    case 'resources': view = resourceView(); label = 'Материалы'; break;
    default: view = todayView(model); selected = 'today'; label = 'Сегодня';
  }
  main.innerHTML = view;
  main.dataset.page = selected;
  nav.innerHTML = navHTML(model, selected);
  breadcrumb.textContent = label;
  document.title = label + ' · Путь в IT';
  if (moveFocus) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

function readDraft(form) {
  const id = form.dataset.id;
  const mode = form.dataset.mode;
  const progress = model.lessons[id] ??= emptyProgress();
  const draft = progress[mode];
  draft.response = form.elements.response.value;
  draft.picks = [...form.querySelectorAll('input[data-check]:checked')]
    .reduce((picks, input) => { picks[Number(input.dataset.check)] = Number(input.value); return picks; }, []);
  draft.rubric = [...form.querySelectorAll('input[data-rubric]')].map(input => input.checked);
  draft.lab = Object.fromEntries([...form.querySelectorAll('[data-lab-key]')]
    .map(input => [input.dataset.labKey, input.value]));
  const assisted = form.elements.repeatAssisted;
  if (assisted) draft.hints = assisted.checked ? 1 : 0;
  return { progress, draft, lesson: lessonById.get(id), mode, key: `${id}/${mode}` };
}

main.addEventListener('input', event => {
  const form = event.target.closest('form[data-form="lesson"]');
  if (form) {
    const { key } = readDraft(form);
    if (event.target.hasAttribute('data-lab-key')) {
      latestLab.delete(key);
      document.querySelector('#lab-result').replaceChildren();
    }
    scheduleSave();
  } else if (event.target.closest('form[data-form]')) {
    otherFormDirty = true;
  }
});

async function assessLab(lesson, draft, mode) {
  const lab = labs[lesson.lab];
  if (!lab) return { passed: true, messages: [] };
  return lab.check(draft.lab, mode === 'repeat');
}

async function assessLesson(form) {
  const { progress, draft, lesson, mode, key } = readDraft(form);
  const exercise = mode === 'repeat' ? lesson.variant : lesson;
  const messages = [];
  const responseOK = draft.response.trim().length >= 12;
  if (!responseOK) messages.push('Добавь своё решение или ссылку с пояснением. Минимум 12 символов.');
  const rubricOK = exercise.rubric.every((_, i) => draft.rubric[i]);
  if (!rubricOK) messages.push('Сверь работу со всеми критериями. Отметь выполненные и исправь остальные.');
  const questions = exercise.checks ?? [];
  let questionsOK = true;
  questions.forEach((check, i) => {
    if (draft.picks[i] == null) {
      questionsOK = false;
      messages.push(`Ответь на вопрос «${check.prompt}».`);
    } else if (draft.picks[i] !== check.answer) {
      questionsOK = false;
      messages.push(check.feedback);
    }
  });
  const lab = await assessLab(lesson, draft, mode);
  if (labs[lesson.lab]) latestLab.set(key, lab);
  if (!lab.passed) {
    messages.push('Поправь ввод в тренажёре и проверь ещё раз.');
    messages.push(...lab.messages.slice(0, 8));
  }
  const passed = responseOK && rubricOK && questionsOK && lab.passed;
  if (passed) {
    messages.push('Ответ заполнен, контрольные вопросы решены и критерии отмечены.');
    messages.push('Качество свободного ответа можно проверить на ревью в разделе «Проект».');
  }
  const attempt = submitAttempt(progress, mode, passed, messages);
  if (attempt.passed && mode === 'repeat' && !attempt.spaced) {
    attempt.messages.push('Этот ответ сохранён как ранняя практика. Интервальный повтор доступен по расписанию.');
  }
  if (attempt.passed && mode === 'repeat' && !attempt.independent) {
    attempt.messages.push('Навык можно подтвердить самостоятельным интервальным повтором.');
  }
  latestAttempt.set(key, attempt);
  await save();
  render();
  document.querySelector('#attempt-result')?.focus();
}

function values(form) {
  return Object.fromEntries([...new FormData(form)].map(([key,value]) => [key, String(value).trim()]));
}

function uniqueId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}

main.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const button = event.submitter ?? form.querySelector('button[type="submit"]');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    const action = form.dataset.form;
    if (action === 'lesson') {
      await assessLesson(form);
      return;
    }
    const data = values(form);
    let message;
    let nextRoute;
    switch (action) {
      case 'diagnosis': {
        if (!data.response) return tell('Добавь ответ или опиши, где остановился.');
        const index = diagnostics.findIndex(task => task.id === form.dataset.id);
        if (index < 0 || !(data.level in LEVELS)) return;
        model.diagnosis[form.dataset.id] = { response: data.response, level: data.level };
        const next = diagnostics[index + 1];
        message = 'Ответ сохранён';
        nextRoute = next ? 'diagnosis/' + next.id : 'diagnosis';
        break;
      }
      case 'track':
        model.track = data.track === 'web' ? 'web' : 'qa';
        message = 'Учебная ветка сохранена';
        break;
      case 'work':
        if (!data.title || !data.evidence || !data.explanation) return tell('Заполни название, доказательство и пояснение.');
        if (model.works.length >= 120) return tell('Скачай копию и освободи место в журнале. Лимит — 120 работ.');
        model.works.unshift({ id: uniqueId(), at: Date.now(), ...data });
        message = 'Работа добавлена';
        break;
      case 'review': {
        const item = model.works.find(item => item.id === form.dataset.id);
        if (!item) return;
        item.review = data.review;
        message = 'Отзыв сохранён';
        break;
      }
      case 'application':
        if (!data.company || !data.position) return tell('Укажи компанию и роль.');
        if (model.applications.length >= 120) return tell('Скачай копию и освободи место в журнале. Лимит — 120 откликов.');
        model.applications.unshift({ id: uniqueId(), at: Date.now(), state: 'sent', ...data });
        message = 'Отклик добавлен';
        break;
      case 'application-status': {
        const item = model.applications.find(item => item.id === form.dataset.id);
        if (!item || !(data.state in APPLICATIONS)) return;
        item.state = data.state;
        item.note = data.note;
        message = 'Журнал обновлён';
        break;
      }
      default: return;
    }
    const stored = await save();
    otherFormDirty = false;
    if (nextRoute) go(nextRoute);
    else render();
    if (stored) tell(message);
  } catch (error) {
    tell(error?.message || 'Проверка прервалась. Попробуй ещё раз.');
  } finally {
    if (button) button.disabled = false;
  }
});

function downloadBackup(prefix = 'progress') {
  const now = new Date();
  const date = new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day:'2-digit' }).format(now);
  const data = JSON.stringify(model);
  const blob = new Blob([data], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `put-v-it-${prefix}-${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

main.addEventListener('change', async event => {
  if (event.target.id !== 'backup-file') return;
  const file = event.target.files?.[0];
  imported = null;
  if (!file) {
    render();
    return;
  }
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Выбери JSON-копию меньше 64 МБ.');
    imported = cleanModel(JSON.parse(await file.text()));
    render();
  } catch (error) {
    const preview = document.querySelector('#import-preview');
    if (preview) preview.innerHTML = `<p class="callout error">${esc(error instanceof SyntaxError ? 'Файл не читается как JSON. Выбери другую копию.' : error.message)}</p>`;
    event.target.value = '';
  }
});

main.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  button.disabled = true;
  try {
    const action = button.dataset.action;
    if (['hint','solution','fresh','lab'].includes(action)) {
      const context = readDraft(button.form);
      const { progress, draft, lesson, mode, key } = context;
      if (action === 'lab') {
        const result = await assessLab(lesson, draft, mode);
        latestLab.set(key, result);
        const panel = document.querySelector('#lab-result');
        if (panel) {
          panel.innerHTML = renderResult(result, 'Тренажёр пройден', 'Тренажёр требует правок');
          panel.focus();
        }
        scheduleSave();
        return;
      }
      if (action === 'hint') draft.hints = Math.min(lesson.hints.length, draft.hints + 1);
      else if (action === 'solution') draft.revealed = true;
      else if (window.confirm('Очистить черновик повтора? История попыток сохранится.')) {
        progress.repeat = emptyProgress().repeat;
        latestLab.delete(key);
      } else return;
      render();
      void save();
      const target = action === 'fresh' ? document.querySelector('#field-response') : document.querySelector('form[data-form=lesson] .callout:last-of-type');
      if (target) {
        target.tabIndex = -1;
        target.focus();
      }
    }
    if (action === 'export') downloadBackup();
    if (action === 'cancel-restore') {
      imported = null;
      render();
    }
    if (action === 'restore' && imported) {
      if (!window.confirm('Восстановить выбранную копию? Текущий прогресс будет выгружен отдельным файлом.')) return;
      await queue;
      const previous = model;
      downloadBackup('before-restore');
      model = { ...imported, rev: previous.rev };
      if (await save()) {
        imported = null;
        latestLab.clear();
        latestAttempt.clear();
        render();
        tell('Копия восстановлена');
      } else {
        model = previous;
        render();
      }
    }
    if (action === 'remove-work' || action === 'remove-application') {
      if (!window.confirm('Удалить запись из этого журнала?')) return;
      const key = action === 'remove-work' ? 'works' : 'applications';
      model[key] = model[key].filter(item => item.id !== button.dataset.id);
      const stored = await save();
      render();
      if (stored) tell('Запись удалена');
    }
  } catch (error) {
    tell(error?.message || 'Действие не завершилось.');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});
window.addEventListener('hashchange', event => {
  if (otherFormDirty && !window.confirm('Перейти к другому разделу? Изменения в форме не сохранены.')) {
    history.replaceState(null, '', event.oldURL);
    return;
  }
  otherFormDirty = false;
  if (inputIsDirty) void save();
  imported = null;
  render(true);
});
window.addEventListener('pagehide', () => {
  if (inputIsDirty) void save();
});
window.addEventListener('beforeunload', event => {
  if (!inputIsDirty && !otherFormDirty) return;
  if (inputIsDirty) void save();
  event.preventDefault();
  event.returnValue = '';
});

try {
  model = await loadModel();
  storageLabel('Прогресс хранится в браузере');
} catch (error) {
  storageLabel('Хранилище недоступно. Можно выгрузить текущие ответы.', true);
  tell(error?.message || 'Сохранение в браузере сейчас недоступно.');
}
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Офлайн-режим пока недоступен.', error);
  });
}
