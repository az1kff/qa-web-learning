import { diagnostics, lessons, sections, lessonById, projectSteps, references } from './course.mjs';
import { dueLessons, emptyProgress, skillStatus } from './state.mjs';
import { labs } from './practice.mjs';

export const NAV = [
  ['today', 'Сегодня', '⌂'], ['route', 'Маршрут', '≡'], ['repeat', 'Повтор', '↻'],
  ['project', 'Проект', '□'], ['career', 'Карьера', '↗'],
];

export const LABELS = {
  new: 'Не начато', trying: 'На доработку', guided: 'С подсказкой', practice: 'Практика пройдена',
  repeat: 'Повтор пройден', applied: 'Применён в проекте', reviewed: 'Есть отзыв',
};

export const APPLICATIONS = { sent: 'Отклик', interview: 'Интервью', test: 'Тестовое', offer: 'Оффер', closed: 'Закрыто' };
export const LEVELS = { new: 'Начать с основ', guided: 'Нужны подсказки', own: 'Сделал самостоятельно' };
export const formatDate = (at, short = false) => new Intl.DateTimeFormat('ru-RU',
  short ? { day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long' }).format(at);

export const esc = (value = '') => String(value).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const url = (key, ...parts) => '#' + [key, ...parts].map(encodeURIComponent).join('/');
const sectionOf = lesson => sections.find(item => item.id === lesson.section);
const badge = (label, style = '') => `<span class="badge ${esc(style)}">${esc(label)}</span>`;
const statusBadge = code => badge(LABELS[code], code);
const anchor = (href, name, style = '') => `<a class="button ${esc(style)}" href="${esc(href)}">${esc(name)}</a>`;
const pageHead = (title, line) => `<div class="page-head"><h1>${esc(title)}</h1><p>${esc(line)}</p></div>`;
const empty = message => `<p class="empty">${esc(message)}</p>`;
const option = (value, label, selected) => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(label)}</option>`;
const navTab = (href, label, active) => `<a href="${esc(href)}"${active ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
const list = items => `<ul class="bullet-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
const namedField = (name, label, value = '', { multiline = false, type = 'text', max = 12000, placeholder = '', required = false } = {}) => {
  const attributes = `id="field-${esc(name)}" name="${esc(name)}" autocomplete="off" maxlength="${max}"${required ? ' required' : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}`;
  return `<div class="field"><label for="field-${esc(name)}">${esc(label)}</label>${multiline
    ? `<textarea ${attributes}>${esc(value)}</textarea>`
    : `<input type="${esc(type)}" ${attributes} value="${esc(value)}">`}</div>`;
};

function lessonCard(model, lesson, repeat = false, note = '') {
  const code = skillStatus(model, lesson.id);
  return `<a class="lesson-card" href="${url('lesson', lesson.id, ...(repeat ? ['repeat'] : []))}">
    <span><strong>${esc(lesson.title)}</strong><small>${esc(note || `${lesson.minutes} мин · ${lesson.skill}`)}</small></span>
    ${repeat ? badge('Повтор', 'repeat') : statusBadge(code)}
  </a>`;
}

export function navHTML(model, page) {
  const count = dueLessons(model, lessons).length;
  return NAV.map(([id, name, glyph]) => `<a class="nav-link" href="#${id}"${page === id ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${glyph}</span><span>${name}</span>${id === 'repeat' && count ? `<span class="nav-count">${count}</span>` : ''}</a>`).join('');
}

function recommendation(model) {
  const first = diagnostics.find(item => !model.diagnosis[item.id]);
  if (first) return {
    label: 'Начать диагностику', href: url('diagnosis', first.id), tag: 'Входная диагностика',
    title: 'Найди точку старта', description: 'Пять коротких задач покажут, с чего начать в HTML, CSS, JavaScript, HTTP и тест-дизайне.',
  };
  const due = dueLessons(model, lessons)[0];
  if (due) return {
    label: 'Начать повтор', href: url('lesson', due.id, 'repeat'), tag: 'Повторение',
    title: due.title, description: 'Сегодня попробуй новую задачу по знакомому навыку.',
  };
  const order = model.track === 'web'
    ? ['foundation','development','api','qa','automation','career']
    : ['foundation','qa','api','development','automation','career'];
  const next = order.flatMap(section => lessons.filter(lesson => lesson.section === section))
    .find(lesson => ['new', 'trying', 'guided'].includes(skillStatus(model, lesson.id)));
  return next
    ? { label: 'Открыть занятие', href: url('lesson', next.id), tag: sectionOf(next).title, title: next.title, description: next.summary }
    : { label: 'Открыть проект', href: '#project', tag: 'Сквозной проект', title: 'Примени изученное', description: 'Выбери следующую функцию и собери доказательства своей работы.' };
}

export function todayView(model) {
  const recommended = recommendation(model);
  const passed = lessons.filter(item => ['practice','repeat','applied','reviewed'].includes(skillStatus(model, item.id))).length;
  const due = dueLessons(model, lessons).length;
  return `<div class="today-head"><div><p class="date">${esc(formatDate(Date.now()))}</p><h1>Сегодня</h1></div>
    <a class="track-choice" href="#data">Трек · ${model.track === 'qa' ? 'Сначала QA' : 'Сначала веб'}</a></div>
    <section class="hero"><div class="hero-copy"><span class="kicker">${esc(recommended.tag)}</span>
      <h2>${esc(recommended.title)}</h2><p>${esc(recommended.description)}</p>
      ${anchor(recommended.href, recommended.label)}
    </div><div class="case-file"><div class="case-top"><span>Учебный стенд</span><span class="case-pulse" aria-hidden="true"></span></div>
      <h3>Заявки на услуги</h3>
      <dl><dt>Операция</dt><dd>POST</dd><dt>Ресурс</dt><dd>/api/requests</dd><dt>Заявка принята</dt><dd class="ok">201</dd><dt>Ошибка названия</dt><dd class="bad">422</dd></dl>
      <hr><p class="case-foot">Форма, список, статусы и тестовые данные</p>
    </div></section>
    <div class="metrics" aria-label="Прогресс"><div class="stat"><strong>${passed}/${lessons.length}</strong><span>Занятия пройдены</span></div>
    <div class="stat"><strong>${due}</strong><span>Пора повторить</span></div><div class="stat"><strong>${model.works.length}</strong><span>Работы в портфолио</span></div></div>
    <div class="split"><section><div class="section-heading"><h2>Карта обучения</h2><a href="#route">Весь маршрут</a></div>
      <div class="grid">${sections.map(item => {
        const course = lessons.filter(lesson => lesson.section === item.id);
        const done = course.filter(lesson => ['practice','repeat','applied','reviewed'].includes(skillStatus(model,lesson.id))).length;
        return `<a class="section-card" href="${url('route',item.id)}"><span class="section-number">${item.code}</span><h3>${esc(item.title)}</h3><p>${done} из ${course.length} занятий</p></a>`;
      }).join('')}</div></section>
    <div class="stack"><section class="panel"><h2>Практика</h2><p class="muted">Проверь форму в двух режимах и зафиксируй, где результат расходится с требованиями.</p>
      <div class="cluster">${anchor('./stand.html','Открыть стенд','secondary')} ${anchor(url('lesson','qa-boundaries'),'Занятие по границам','subtle')}</div></section>
    <section class="panel"><h2>Диагностика</h2><p class="muted">Сдано ${diagnostics.filter(item => model.diagnosis[item.id]).length} из ${diagnostics.length} заданий.</p>
      <div class="cluster">${anchor('#diagnosis','Открыть ответы','secondary')}</div></section></div></div>`;
}

export function routeView(model, filter) {
  const isSection = sections.some(item => item.id === filter);
  const tabs = `<nav class="tabs" aria-label="Модули маршрута">${navTab('#route','Все модули', !isSection)}${sections.map(item => navTab(url('route',item.id),item.title,item.id === filter)).join('')}</nav>`;
  return pageHead('Маршрут', 'Переходи от коротких упражнений к работе в проекте. У каждой темы сохраняется своя история практики.') + tabs
    + (isSection ? sections.filter(section => section.id === filter) : sections).map(section => {
      const course = lessons.filter(item => item.section === section.id);
      return `<section class="panel"><div class="section-heading"><h2>${esc(section.title)}</h2><span class="kicker">${section.code}</span></div>
      <p class="muted">${esc(section.intro)}</p><div class="stack">${course.map(lesson => lessonCard(model,lesson)).join('')}</div></section>`;
    }).join('');
}

export function diagnosisView(model, id) {
  const task = diagnostics.find(item => item.id === id);
  if (!task) return pageHead('Входная диагностика', 'Сделай первый подход самостоятельно. Если не получилось, опиши, где ты остановился. После ответа отметь, какие подсказки понадобились.')
    + `<div class="stack">${diagnostics.map(item => `<a class="lesson-card" href="${url('diagnosis',item.id)}"><span><strong>${esc(item.title)}</strong><small>${item.time} мин</small></span>${model.diagnosis[item.id] ? badge(LEVELS[model.diagnosis[item.id].level], 'practice') : badge('Нет ответа')}</a>`).join('')}</div>
    <div class="cluster" style="margin-top:16px">${anchor('#route','Открыть маршрут','secondary')}</div>`;
  const saved = model.diagnosis[id];
  const next = diagnostics[diagnostics.indexOf(task) + 1];
  return pageHead(task.title, `Диагностика · ${task.time} мин`)
    + `<section class="panel"><h2>Задача</h2><p>${esc(task.task)}</p><form class="stack" data-form="diagnosis" data-id="${esc(id)}">
      ${namedField('response','Ответ или место, где ты остановился', saved?.response, { multiline: true, required: true })}
      <details><summary>Сверить по критерию</summary><p>${esc(task.rubric)}</p></details>
      <div class="field"><label for="diagnostic-level">Как ты справился</label>
        <select id="diagnostic-level" name="level">${Object.entries(LEVELS).map(([value,label]) => option(value,label,saved?.level)).join('')}</select>
      </div><div class="cluster"><button class="button" type="submit">Сохранить ответ</button>${anchor('#diagnosis','Все задания','secondary')}
      ${saved && next ? anchor(url('diagnosis',next.id),'Следующее задание','subtle') : ''}</div>
    </form></section>`;
}

function labField(field, index, value) {
  const id = 'lab-' + index;
  const attrs = `id="${id}" name="lab-${esc(field.key)}" data-lab-key="${esc(field.key)}" autocomplete="off"`;
  const placeholder = field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : '';
  const control = field.type === 'select'
    ? `<select ${attrs}>${option('','Выбери вариант',value)}${field.options.map(item=>option(item.value,item.label,value)).join('')}</select>`
    : field.type === 'textarea'
      ? `<textarea class="code-input" spellcheck="false" maxlength="12000" ${attrs}${placeholder}>${esc(value)}</textarea>`
      : `<input ${attrs} type="${field.type === 'number' ? 'number' : 'text'}" maxlength="3000" value="${esc(value)}"${placeholder}>`;
  return `<div class="field"><label for="${id}">${esc(field.label)}</label>${control}</div>`;
}

function questionBlock(checks, picks) {
  return checks.map((check, i) => `<fieldset><legend>${esc(check.prompt)}</legend>${check.options.map((answer,j) => `<label class="option"><input type="radio" name="check-${i}" value="${j}" data-check="${i}"${picks?.[i] === j ? ' checked' : ''}><span>${esc(answer)}</span></label>`).join('')}</fieldset>`).join('');
}

export function lessonView(model, lesson, mode, transient) {
  const progress = model.lessons[lesson.id] ?? emptyProgress();
  const draft = progress[mode];
  const isRepeat = mode === 'repeat';
  const exercise = isRepeat ? lesson.variant : lesson;
  const checks = exercise.checks ?? [];
  const lab = labs[lesson.lab];
  const last = transient.attempt ?? progress.attempts.find(item => item.mode === mode);
  const hints = lesson.hints.slice(0, draft.hints);
  const hasPractice = progress.practicePassed || progress.attempts.some(item => item.mode === 'practice');
  const nextCourse = lessons.filter(item => item.section === lesson.section);
  const next = nextCourse[nextCourse.indexOf(lesson) + 1];
  return `<header class="page-head"><div class="cluster"><a href="${url('route',lesson.section)}">${esc(sectionOf(lesson).title)}</a><span class="muted">${isRepeat ? 'Повтор' : `${lesson.minutes} мин`}</span>${statusBadge(skillStatus(model,lesson.id))}</div>
    <h1>${esc(lesson.title)}</h1><p>${esc(lesson.summary)}</p></header>
    <nav class="tabs" aria-label="Этапы занятия">${navTab(url('lesson',lesson.id),'Занятие',!isRepeat)}
      ${hasPractice ? navTab(url('lesson',lesson.id,'repeat'),'Новый вариант',isRepeat) : ''}</nav>
    <div class="lesson-layout"><div>
    ${isRepeat ? `<section class="panel"><h2>Изменённое условие</h2><p>Реши задачу по памяти. Повтор учитывается как интервальный после назначенной даты.</p></section>`
      : `<section class="panel"><h2>Что нужно знать</h2>${list(lesson.theory)}<div class="example"><strong>Разобранный пример</strong><p>${esc(lesson.example)}</p></div></section>`}
    <form class="panel" data-form="lesson" data-id="${esc(lesson.id)}" data-mode="${mode}">
      <h2>Твоя задача</h2><p class="task-text">${esc(exercise.task)}</p>
      ${lesson.id === 'qa-boundaries' ? `<div class="cluster">${anchor('./stand.html','Открыть стенд формы','secondary')}</div>` : ''}
      <div class="stack">
      ${namedField('response','Решение, наблюдения или ссылка на свою работу',draft.response,{ multiline:true, placeholder:'Опиши ход работы и результат…' })}
      ${lab ? `<div class="stack"><h3>Тренажёр</h3><p class="task-text muted">${esc(isRepeat ? lab.variantIntro ?? lab.intro : lab.intro)}</p>
        ${lab.fields.map((field,i) => labField(field,i,draft.lab[field.key] ?? field.initial ?? '')).join('')}
        <div><button type="button" class="button secondary" data-action="lab">Проверить тренажёр</button></div>
        <div id="lab-result" tabindex="-1" aria-live="polite">${transient.lab ? renderResult(transient.lab, 'Тренажёр пройден', 'Тренажёр требует правок') : ''}</div></div>` : ''}
      ${checks.length ? `<div class="stack"><h3>Контрольные вопросы</h3>${questionBlock(checks,draft.picks)}</div>` : ''}
      <fieldset><legend>Критерии самопроверки</legend>${exercise.rubric.map((item,i) => `<label class="option"><input type="checkbox" name="rubric-${i}" data-rubric="${i}"${draft.rubric[i] ? ' checked' : ''}><span>${esc(item)}</span></label>`).join('')}</fieldset>
      ${isRepeat ? `<label class="option"><input type="checkbox" name="repeatAssisted"${draft.hints ? ' checked' : ''}><span>Я использовал подсказку по этому условию</span></label>` : ''}
      <div class="cluster"><button type="submit" class="button">Сохранить и проверить</button>
      ${!isRepeat && draft.hints < lesson.hints.length ? '<button type="button" class="button secondary" data-action="hint">Открыть подсказку</button>' : ''}
      ${!isRepeat && !draft.revealed && last ? '<button type="button" class="button subtle" data-action="solution">Разобрать решение</button>' : ''}
      ${isRepeat && (draft.response || draft.hints || draft.revealed || draft.picks.some(value => value != null)) ? '<button type="button" class="button subtle" data-action="fresh">Очистить черновик повтора</button>' : ''}
      </div>
      ${hints.length && !isRepeat ? `<aside class="callout"><strong>Подсказки</strong>${list(hints)}</aside>` : ''}
      ${draft.revealed && !isRepeat ? `<div class="callout"><strong>Ход решения</strong><p class="task-text">${esc(lesson.solution)}</p></div>` : ''}
      <div id="attempt-result" tabindex="-1" aria-live="polite">${last ? renderResult(last,
        last.independent ? 'Практика пройдена' : 'Практика пройдена с подсказкой', 'Есть что доработать') : ''}</div></div>
    </form></div>
    <aside class="lesson-aside stack"><section class="panel"><h2>Прогресс</h2><div class="stack">${statusBadge(skillStatus(model,lesson.id))}
      <p class="small muted">${progress.due ? `Повтор · ${esc(formatDate(progress.due,true))}` : 'Повтор появится после попытки.'}</p>
      ${anchor(url('project',lesson.id),'Приложить работу','secondary')}
      ${next ? anchor(url('lesson',next.id),'Следующее занятие','subtle') : ''}
    </div></section>
    ${lesson.source ? `<section class="panel"><h3>Связанные материалы</h3><p class="small muted">${/^https:\/\//i.test(lesson.source) ? `<a href="${esc(lesson.source)}" rel="noreferrer">Открыть справочник</a>` : esc(lesson.source)}</p></section>` : ''}
    ${progress.attempts.length ? `<section class="panel"><h3>Последние попытки</h3><ul class="data-list log-list">${progress.attempts.map(item => `<li><span class="small">${esc(formatDate(item.at,true))} · ${item.mode === 'repeat' ? 'Повтор' : 'Практика'}</span><br>${badge(item.passed ? 'Пройдена' : 'На доработку', item.passed ? 'success' : 'warning')}
      <details><summary>Ответ и разбор</summary>${item.response ? `<p class="task-text">${esc(item.response)}</p>` : ''}${list(item.messages)}</details></li>`).join('')}</ul></section>` : ''}</aside></div>`;
}

export function renderResult(result, passed, failed) {
  return `<section class="callout ${result.passed ? 'success' : 'error'}"><strong>${esc(result.passed ? passed : failed)}</strong>${list(result.messages)}</section>`;
}

export function repeatView(model) {
  const due = dueLessons(model, lessons);
  const future = lessons.filter(lesson => model.lessons[lesson.id]?.due > Date.now())
    .sort((a,b) => model.lessons[a.id].due - model.lessons[b.id].due);
  return pageHead('Повторение','Решай знакомую задачу с новым условием. После ошибки следующий повтор появится через сутки.')
    + `<section class="panel"><h2>На сегодня</h2><div class="stack">${due.length ? due.map(item => lessonCard(model,item,true)).join('') : empty('На сегодня повторов нет. После попытки занятие появится в очереди.')}</div></section>
    <section class="panel"><h2>Запланировано</h2><div class="stack">${future.length ? future.map(item => lessonCard(model,item,true,'С ' + formatDate(model.lessons[item.id].due,true))).join('') : empty('Здесь будут следующие даты повторения.')}</div></section>`;
}

export function projectView(model, lessonId) {
  const selected = lessonById.get(lessonId);
  return pageHead('Заявки на услуги','Один проект для разработки, тестирования и портфолио. Данные и дефекты учебные.')
    + `<div class="split"><section class="panel"><h2>Практический стенд</h2><p class="muted">Проверь создание заявки, смену статуса и ошибки формы. В режиме учебного дефекта можно собрать свой баг-репорт.</p>
    <div class="cluster">${anchor('./stand.html','Открыть стенд')} ${anchor('#resources','Файлы практики','secondary')}</div>
    <ol class="data-list">${projectSteps.map((item, i) => `<li><h3>${i + 1}. ${esc(item.title)}</h3><p>${esc(item.work)}</p><p class="small muted">${esc(item.deliverable)}</p>
    ${item.lesson && lessonById.has(item.lesson) ? `<p><a href="${url('lesson',item.lesson)}">Открыть занятие</a></p>` : ''}</li>`).join('')}</ol></section>
    <div class="stack"><section class="panel"><h2>Добавить работу</h2><form data-form="work" class="stack">
    ${namedField('title','Название работы',selected?.title,{max:120,required:true})}
    <div class="field"><label for="work-lesson">Занятие</label><select id="work-lesson" name="lesson">
      ${option('','Самостоятельная работа',selected?.id)}${lessons.map(lesson=>option(lesson.id,lesson.title,selected?.id)).join('')}</select></div>
    ${namedField('evidence','Файл, ссылка на коммит или другой результат','',{max:1200,required:true})}
    ${namedField('explanation','Что сделал и как проверил','',{multiline:true,required:true})}
    ${namedField('review','Отзыв наставника или коллеги, если уже есть','',{multiline:true,max:1800})}
    <div><button class="button" type="submit">Добавить в портфолио</button></div></form></section>
    <section class="panel"><h2>Портфолио</h2>${model.works.length ? `<ul class="data-list log-list">${model.works.map(item => `<li><strong>${esc(item.title)}</strong><p class="small muted">${esc(item.evidence)}</p><p class="task-text">${esc(item.explanation)}</p>
      <details><summary>Ревью и действия</summary><form class="stack" data-form="review" data-id="${esc(item.id)}"><div class="field"><label>Отзыв внешнего ревьюера<textarea name="review" maxlength="1800">${esc(item.review)}</textarea></label></div><div class="cluster"><button class="button secondary" type="submit">Сохранить отзыв</button><button class="button subtle" type="button" data-action="remove-work" data-id="${esc(item.id)}">Удалить</button></div></form></details></li>`).join('')}</ul>` : empty('Здесь появятся ссылки, объяснения и отзывы по твоим работам.')}</section></div></div>`;
}

export function careerView(model) {
  const course = lessons.filter(item => item.section === 'career');
  return pageHead('Карьера', 'Подготовь отдельные подтверждённые работы для выбранной роли и запиши, что узнал из откликов.')
    + `<div class="split"><section class="panel"><h2>Подготовка</h2><div class="stack">${course.map(lesson=>lessonCard(model,lesson)).join('')}</div></section>
    <section class="panel"><h2>Новый отклик</h2><form class="stack" data-form="application">
      ${namedField('company','Компания','',{max:100,required:true})}${namedField('position','Роль','',{max:140,required:true})}
      ${namedField('link','Ссылка на вакансию','',{max:1200,type:'url'})}${namedField('note','Заметка или ответ работодателя','',{multiline:true,max:1800})}
      <div><button class="button" type="submit">Добавить отклик</button></div>
    </form></section></div>
    <section class="panel" style="margin-top:16px"><h2>Журнал откликов</h2>
    ${model.applications.length ? `<ul class="data-list log-list">${model.applications.map(item => `<li><strong>${esc(item.company)} · ${esc(item.position)}</strong><p class="small muted">${esc(formatDate(item.at,true))}${/^https?:\/\//i.test(item.link) ? ` · <a href="${esc(item.link)}" rel="noreferrer">Вакансия</a>` : ''}</p>
    <form class="stack" data-form="application-status" data-id="${esc(item.id)}"><div class="field"><label>Этап<select name="state">${Object.entries(APPLICATIONS).map(([key,name]) => option(key,name,item.state)).join('')}</select></label></div>
    <div class="field"><label>Заметка<textarea name="note" maxlength="1800">${esc(item.note)}</textarea></label></div>
    <div class="cluster"><button class="button secondary" type="submit">Обновить отклик</button><button class="button subtle" type="button" data-action="remove-application" data-id="${esc(item.id)}">Удалить</button></div></form></li>`).join('')}</ul>` : empty('Добавь вакансию после первого отклика.')}</section>`;
}

export function dataView(model, storage, imported) {
  const copyCount = imported ? Object.values(imported.lessons).reduce((sum, item)=>sum+item.attempts.length,0) : 0;
  return pageHead('Данные','Прогресс сохраняется в этом браузере. Перенеси его на другой компьютер или профиль с помощью JSON-копии.')
    + `<div class="split"><section class="panel"><h2>Настройки</h2><form class="stack" data-form="track">
      <div class="field"><label for="track">Ветка после фундамента</label><select id="track" name="track">${option('qa','Сначала ручной QA',model.track)}${option('web','Сначала веб-разработка',model.track)}</select></div>
      <div class="cluster"><button type="submit" class="button">Сохранить ветку</button></div></form>
      <p class="muted small" style="margin-top:13px">${esc(storage)}</p></section>
    <div class="stack"><section class="panel"><h2>Экспорт</h2><p class="muted">Копия содержит черновики, ответы, повторы и ссылки на работы. Исходники работ хранятся в своих папках.</p><div class="cluster">
    <button class="button" type="button" data-action="export">Скачать JSON</button></div></section>
    <section class="panel"><h2>Восстановление</h2><div class="field" style="margin-top:12px"><label for="backup-file">Выбрать резервную копию JSON</label><input id="backup-file" name="backup-file" type="file" accept=".json,application/json"></div>
    <div id="import-preview" aria-live="polite">${imported ? `<div class="callout"><strong>Копия прочитана</strong><p>Попыток · ${copyCount}. Работ · ${imported.works.length}. Откликов · ${imported.applications.length}.</p><p>Перед восстановлением сохрани текущую копию.</p><div class="cluster"><button class="button" type="button" data-action="restore">Восстановить данные</button><button type="button" class="button subtle" data-action="cancel-restore">Отмена</button></div></div>` : ''}</div></section></div></div>`;
}

export function resourceView() {
  return pageHead('Материалы', 'Официальные справочники и файлы для самостоятельных запусков.')
    + `<div class="split"><section class="panel"><h2>Файлы практики</h2><p class="muted">Сохрани учебные файлы в одну папку на диске D.</p>
      <ul class="link-list">
        <li><a href="./exercise.mjs" download>JavaScript · заготовка фильтра и валидации</a></li>
        <li><a href="./exercise.test.mjs" download>Node Test · проверки для задания</a></li>
        <li><a href="./sql-practice.mjs" download>SQLite · локальная база с готовыми данными</a></li>
        <li><a href="./ci-node-tests.yml" download>GitHub Actions · шаблон запуска учебных тестов</a></li>
        <li><a href="./practice-guide.txt" download>Порядок работы с кодом и API</a></li>
      </ul><p>Локальная проверка · <code translate="no">node --test exercise.test.mjs</code></p>
      <p class="small muted">Встроенные тренажёры проверяют задания с ограниченными входами. Свой код можно запускать отдельно на компьютере.</p>
    </section><section class="panel"><h2>Документация</h2><ul class="link-list">${references.map(([label,href])=>`<li><a href="${esc(href)}" rel="noreferrer">${esc(label)}</a></li>`).join('')}</ul></section></div>
    <section class="panel" style="margin-top:16px"><h2>Материалы маршрута</h2><p>Карьерские задания опираются на темы «Инсайт чат». Порядок развития ручного QA сверён с QA Roadmap IT PUNK. Условия, стенд и проверочные сценарии написаны для этого практикума.</p></section>`;
}
