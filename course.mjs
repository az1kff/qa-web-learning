import { qaLessons } from './content-qa.mjs';
import { webLessons } from './content-web.mjs';
import { checkpoints } from './checkpoints.mjs';

export const sections = [
  { id: 'foundation', title: 'Фундамент веба', intro: 'Браузер, разметка, JavaScript, терминал и Git.', code: '01' },
  { id: 'qa', title: 'Ручное тестирование', intro: 'Требования, проверки, дефекты и исследовательские сессии.', code: '02' },
  { id: 'api', title: 'API и данные', intro: 'DevTools, HTTP, контракты, Postman и SQL.', code: '03' },
  { id: 'development', title: 'Веб-разработка', intro: 'Сервер, TypeScript, React и осознанный выбор фреймворка.', code: '04' },
  { id: 'automation', title: 'Автотесты и CI', intro: 'Проверки логики, API и пользовательского сценария.', code: '05' },
  { id: 'career', title: 'Портфолио и отклики', intro: 'Подтверждённые работы, собеседования и журнал откликов.', code: '06' },
];

export const lessons = sections.flatMap(section => [...webLessons, ...qaLessons, ...checkpoints].filter(item => item.section === section.id));
export const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));

export const diagnostics = [
  { id: 'web', title: 'Браузер и сервер', time: 4, task: 'Форма отправила POST на /api/requests. В Network виден 422 и тело ответа с ошибкой поля title. Объясни, кто сформировал запрос и ответ. Что ещё нужно проверить, чтобы понять, создалась ли запись?', rubric: 'Различаешь метод, статус, тело и состояние списка заявок.' },
  { id: 'html', title: 'HTML', time: 5, task: 'Напиши разметку формы с полем «Название заявки» и кнопкой «Создать». Подпись должна помогать выбрать поле мышью и понимать его со скринридером.', rubric: 'Есть связанные label и input, подходящая кнопка отправки и понятный порядок.' },
  { id: 'css', title: 'CSS', time: 5, task: 'Поле и кнопка стоят рядом на компьютере, а на узком экране — друг под другом. Напиши стили или опиши механизм и способ проверки на двух ширинах.', rubric: 'Ожидание на обеих ширинах, отсутствие горизонтального скролла, понятный способ проверки.' },
  { id: 'js', title: 'JavaScript', time: 7, task: 'У заявки есть id и status. Напиши функцию, которая возвращает заявки со статусом open в исходном порядке. Покажи результат на смешанном и на пустом списке.', rubric: 'Проверка по статусу, новый список, пустой вход, объяснение результата.' },
  { id: 'qa', title: 'Тест-дизайн', time: 8, task: 'Можно сохранить сумму от 500 до 5 000 ₽ включительно. Стенд принял 499 ₽. Дай 5–7 входов с ожидаемыми результатами и короткий воспроизводимый баг-репорт.', rubric: 'Границы и соседние значения, ожидаемый и фактический результат, условия и шаги.' },
];

export const projectSteps = [
  { id: 'form', title: 'Форма заявки', work: 'Разметь форму, проверь требования к названию и оформи правку валидации. Докажи её на исходном и соседнем входе.', deliverable: 'Чек-лист границ, баг-репорт, diff, результат прогона.', lesson: 'qa-boundaries' },
  { id: 'board', title: 'Список и статусы', work: 'Добавь поиск или фильтр в своём коде. Покажи пустое состояние, проверь клавиатуру и переходы между статусами.', deliverable: 'README, скриншот, дифф и матрица переходов.' },
  { id: 'api', title: 'Контракт HTTP', work: 'Изучи путь от формы до списка. Проверь контракт API, запросы с неверным входом и итоговое состояние.', deliverable: 'Коллекция запросов или таблица с методом, статусом, телом и результатом.' },
  { id: 'sql', title: 'Данные и SQL', work: 'Собери выборку по статусам и сводку по услугам. Включи услуги без заявок и обоснуй выбранный JOIN.', deliverable: 'Запросы, тестовые данные, ожидаемые и полученные строки.' },
  { id: 'test', title: 'Автотесты и CI', work: 'Напиши проверку логики, API-проверку и один сценарий браузера. Запусти проверку на своей ветке и покажи падение на контролируемой регрессии.', deliverable: 'Тесты, ссылка на прогон, объяснение выбранных уровней.' },
  { id: 'career', title: 'Защита проекта', work: 'Опиши личный вклад и проведи пятиминутную защиту. Объясни один риск, одну неудобную ошибку и одну проверку, которую ты сознательно выбрал.', deliverable: 'Кейс портфолио и короткое резюме для выбранной роли.' },
];

export const references = [
  ['MDN Curriculum','https://developer.mozilla.org/en-US/curriculum/'],
  ['ISTQB CTFL · тест-дизайн','https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/'],
  ['Chrome DevTools · Network','https://developer.chrome.com/docs/devtools/network/reference'],
  ['Postman · проверки ответа','https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/'],
  ['Pro Git','https://git-scm.com/book/ru/v2'],
  ['SQLite · SELECT','https://www.sqlite.org/lang_select.html'],
  ['TypeScript Handbook','https://www.typescriptlang.org/docs/handbook/intro'],
  ['React Learn','https://react.dev/learn'],
  ['Playwright · практики','https://playwright.dev/docs/best-practices'],
  ['GitHub Actions','https://docs.github.com/en/actions/get-started/understand-github-actions'],
];
