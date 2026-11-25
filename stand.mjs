import { createBrowserWorkshop } from './browser-workshop.mjs';

const byId = (id) => document.getElementById(id);
const form = byId('request-form');
const title = byId('title');
const mode = byId('mode');
const service = byId('service');
const filter = byId('filter');
const list = byId('requests');
const empty = byId('empty-list');
const connection = byId('connection');
const listResult = byId('list-result');
const formResult = byId('form-result');
const route = '/api/requests';
const browserMode = location.hostname.endsWith('.github.io');
let demo;
if (browserMode) {
  try { demo = createBrowserWorkshop(localStorage); }
  catch { demo = createBrowserWorkshop(); }
  byId('stand-intro').textContent = 'На GitHub Pages стенд моделирует работу API в браузере. Данные сохраняются в этом профиле. Для практики с реальными HTTP-запросами скачай проект и запусти его локально.';
}
const statusLabel = browserMode ? 'Учебный статус' : 'HTTP';
const names = new Map([[1, 'Ремонт'], [2, 'Уборка'], [3, 'Доставка']]);
const errorText = new Map([
  ['TITLE_LENGTH', 'Название должно содержать от 4 до 24 символов.'],
  ['TITLE_TYPE', 'Укажи название заявки.'],
  ['REQUEST_NOT_FOUND', 'Заявка исчезла из списка. Обнови его и попробуй снова.'],
  ['WORKSHOP_FULL', 'Учебный список заполнен. Сбрось заявки, чтобы продолжить.'],
]);

let entries = null;
let connected = false;
let busy = false;

class ApiError extends Error {
  constructor(status, payload) {
    super(errorText.get(payload.code) ?? 'Учебный API вернул ошибку.');
    this.status = status;
    this.field = payload.field;
  }
}

function show(message, element, state) {
  element.textContent = message;
  element.hidden = false;
  if (state) element.className = `callout ${state}`;
}

async function api(path = route, method = 'GET', body) {
  if (demo) {
    const { status, data } = demo(path, method, body);
    if (status >= 400) throw new ApiError(status, data);
    return data;
  }
  const response = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  if (!response.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('API unavailable');
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

function renderRows() {
  const visible = (entries ?? []).filter((item) => filter.value === 'all' || item.status === filter.value);
  const rows = visible.map((item) => {
    const entry = document.createElement('li');
    entry.className = 'stand-record';
    entry.dataset.requestId = String(item.id);

    const description = document.createElement('div');
    const meta = document.createElement('p');
    const closed = item.status === 'closed';
    const badge = document.createElement('span');
    badge.className = `badge${closed ? '' : ' success'}`;
    badge.textContent = closed ? 'Закрыта' : 'Открыта';
    meta.append(`№${item.id} · ${names.get(item.serviceId)} · `, badge);
    const heading = document.createElement('strong');
    heading.textContent = item.title || 'Пустое название';
    description.append(heading, meta);

    const action = document.createElement('button');
    action.className = 'button subtle';
    action.type = 'button';
    action.textContent = closed ? 'Открыть' : 'Закрыть';
    action.setAttribute('aria-label', `${action.textContent} заявку №${item.id}`);
    action.dataset.id = String(item.id);
    action.dataset.status = closed ? 'open' : 'closed';
    entry.append(description, action);
    return entry;
  });

  list.replaceChildren(...rows);
  empty.hidden = entries === null || visible.length > 0;
  empty.textContent = filter.value === 'all' ? 'Заявок пока нет.' : 'В этом статусе заявок нет.';
}

function renderConnection() {
  connection.className = connected ? 'muted' : 'callout error';
  connection.textContent = connected
    ? `${browserMode ? 'Режим симуляции' : 'Учебный API доступен'}. Заявок в списке ${entries.length}.`
    : 'Учебный API недоступен. Запусти локальный сервер и обнови список. Просмотренный ранее список может быть устаревшим.';
}

function toggleActions() {
  for (const button of [byId('create'), byId('reset'), ...list.querySelectorAll('button')]) {
    button.disabled = busy || !connected;
  }
  byId('refresh').disabled = busy;
}

async function reload() {
  const fresh = await api();
  if (!Array.isArray(fresh)) throw new Error('Invalid workshop response');
  entries = fresh;
}

async function run(action, feedback = listResult) {
  if (busy) return;
  const previousFocus = document.activeElement;
  busy = true;
  toggleActions();
  try {
    await action();
    connected = true;
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      connected = entries !== null;
      show(`${error.message} ${statusLabel} ${error.status}.`, feedback, feedback === formResult ? 'error' : undefined);
      if (error.field === 'title') {
        title.setAttribute('aria-invalid', 'true');
        title.focus();
      }
    } else {
      connected = false;
      show('Проверь подключение и обнови список перед новой попыткой.', feedback, feedback === formResult ? 'error' : undefined);
    }
  } finally {
    busy = false;
    renderRows();
    renderConnection();
    toggleActions();
    if (document.activeElement === document.body && previousFocus instanceof HTMLButtonElement) {
      const id = previousFocus.dataset.id;
      const target = id ? list.querySelector(`button[data-id="${id}"]`) ?? filter : previousFocus;
      if (!target.disabled) target.focus();
    }
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    title.removeAttribute('aria-invalid');
    const created = await api(route, 'POST', { title: title.value, serviceId: Number(service.value), mode: mode.value });
    title.value = '';
    show(`Заявка №${created.id} создана. ${statusLabel} 201.`, formResult, 'success');
    await reload();
  }, formResult);
});

title.addEventListener('input', () => title.removeAttribute('aria-invalid'));

filter.addEventListener('change', () => {
  renderRows();
  toggleActions();
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button || !connected) return;
  const { id, status } = button.dataset;
  run(async () => {
    await api(`${route}/${id}`, 'PATCH', { status });
    show(`Статус заявки №${id} изменён.`, listResult);
    await reload();
  });
});

byId('refresh').addEventListener('click', () => run(async () => {
  await reload();
  show('Список обновлён.', listResult);
}));

byId('reset').addEventListener('click', () => run(async () => {
  entries = await api(`${route}/reset`, 'POST', {});
  filter.value = 'all';
  formResult.hidden = true;
  show('Исходные учебные заявки восстановлены.', listResult);
}));

window.addEventListener('offline', () => {
  connected = false;
  renderConnection();
  toggleActions();
});
window.addEventListener('online', () => run(reload));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') run(reload);
});

run(reload);
