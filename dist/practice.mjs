const requests = [
  { id: 101, title: 'Замена крана', status: 'open', service_id: 1 },
  { id: 102, title: 'Уборка квартиры', status: 'closed', service_id: 2 },
  { id: 103, title: 'Настройка роутера', status: 'open', service_id: 1 },
  { id: 104, title: 'Уборка кухни', status: 'closed', service_id: 2 },
];

const services = [
  { id: 1, name: 'Ремонт' },
  { id: 2, name: 'Уборка' },
  { id: 3, name: 'Доставка' },
];

function select(key, label, options) {
  return { key, label, type: 'select', options: options.map(([value, text]) => ({ value, label: text })) };
}

function result(issues, success) {
  return { passed: issues.length === 0, messages: issues.length ? issues : [success] };
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const direction = { asc: (a, b) => a.id - b.id, desc: (a, b) => b.id - a.id };

const sqlData = 'Таблица requests (id, title, status, service_id). Строки\n101 | Замена крана | open | 1\n102 | Уборка квартиры | closed | 2\n103 | Настройка роутера | open | 1\n104 | Уборка кухни | closed | 2';
const sqlLimits = 'Тренажёр поддерживает только конструкции этого задания, без псевдонимов и произвольных SQL-команд. Это вычисление по учебным строкам, без подключения к СУБД.';
const sqlSelectSyntax = /^select\s+id\s*,\s*title\s+from\s+requests\s+where\s+status\s*=\s*'([a-z]+)'\s+order\s+by\s+id(?:\s+(asc|desc))?\s*;?$/i;
const sqlJoinSyntax = /^select\s+services\.name\s*,\s*count\s*\(\s*(requests\.id|\*)\s*\)(?:\s+as\s+total)?\s+from\s+services\s+(?:(left(?:\s+outer)?|inner)\s+)?join\s+requests\s+on\s+(services\.id\s*=\s*requests\.service_id|requests\.service_id\s*=\s*services\.id)\s+group\s+by\s+(services\.id\s*,\s*services\.name|services\.name\s*,\s*services\.id)\s*;?$/i;
const sqlField = { key: 'query', label: 'SQL-запрос', type: 'textarea', placeholder: 'SELECT …' };

const filterMethods = {
  filter: (rows, condition) => rows.filter(condition),
  find: (rows, condition) => rows.find(condition),
  map: (rows, condition) => rows.map(condition),
};

const filterProperties = {
  status: (request) => request.status,
  title: (request) => request.title,
  id: (request) => request.id,
};

const titleTransforms = {
  trim: (value) => value.trim(),
  original: (value) => value,
  lowercase: (value) => value.toLowerCase(),
};

const ranges = {
  inclusive: (length, min, max) => length >= min && length <= max,
  exclusive: (length, min, max) => length > min && length < max,
  or: (length, min, max) => length >= min || length <= max,
};

const blankMessages = 'Название должно содержать от 4 до 24 символов.';

const qaTitle = {
  intro: 'Название заявки должно содержать от 4 до 24 символов включительно после удаления пробелов по краям. В форме заявки при вводе «  кот  » появилась карточка заявки. Форма должна была показать ошибку, а список остаться прежним. Выбери проверки около обеих границ и зафиксируй дефект.',
  variantIntro: 'Правила изменились. Теперь в названии от 5 до 30 символов включительно после удаления пробелов по краям. При отправке «  абвг  » форма создала карточку. Обнови набор проверок и подготовь баг-репорт для этих условий.',
  review: true,
  fields: [
    { key: 'bounds', label: 'Длины строк около нижней и верхней границ', type: 'text', placeholder: 'Шесть чисел по возрастанию через пробел' },
    { key: 'summary', label: 'Заголовок дефекта', type: 'text' },
    { key: 'steps', label: 'Предусловия, данные и шаги', type: 'textarea' },
    { key: 'expected', label: 'Ожидаемый результат', type: 'textarea' },
    { key: 'actual', label: 'Фактический результат', type: 'textarea' },
  ],
  async check(values, variant = false) {
    const expected = variant ? [4, 5, 6, 29, 30, 31] : [3, 4, 5, 23, 24, 25];
    const entered = trimmed(values.bounds).split(/[\s,;]+/);
    const issues = [];
    if (entered.length !== expected.length || entered.some((value, index) => !/^\d+$/.test(value) || Number(value) !== expected[index])) {
      issues.push('Для каждой границы проверь значение до границы, на границе и после неё. Считай длину после удаления пробелов по краям.');
    }
    if (['summary', 'steps', 'expected', 'actual'].some((key) => !trimmed(values[key]))) {
      issues.push('Заполни заголовок, шаги, ожидаемый и фактический результаты.');
    }
    return result(issues, 'Граничные значения верны, все поля отчёта заполнены. На ревью проверь, можно ли повторить дефект по шагам, опирается ли ожидаемый результат на правило и описывает ли фактический результат то, что видно в форме.');
  },
};

export const labs = {
  'html-label': {
    intro: 'Форма содержит <label>Название заявки</label> и <input id="title" name="request-title">. Напиши открывающий тег label, который свяжет подпись с этим полем, и укажи доступное имя поля.',
    variantIntro: 'Добавилось поле <textarea id="details" name="request-description"> и подпись «Описание заявки». Напиши открывающий тег label, связывающий их, и укажи доступное имя.',
    fields: [
      { key: 'tag', label: 'Открывающий тег label', type: 'text', placeholder: '<label …>' },
      { key: 'name', label: 'Доступное имя поля', type: 'text' },
    ],
    async check(values, variant = false) {
      const [, doubleQuoted, singleQuoted, unquoted] = /^<label\s+for\s*=\s*(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\s*>$/i.exec(trimmed(values.tag)) || [];
      const id = doubleQuoted || singleQuoted || unquoted;
      const issues = [];
      if (id !== (variant ? 'details' : 'title')) issues.push('Укажи в for значение id нужного поля. Здесь мы проверяем один атрибут в открывающем теге label.');
      if (trimmed(values.name).toLocaleLowerCase('ru') !== (variant ? 'описание заявки' : 'название заявки')) {
        issues.push('Доступное имя в этом примере задаёт текст связанной подписи.');
      }
      return result(issues, 'Подпись связана с полем через for и id, а её текст даёт полю доступное имя.');
    },
  },

  'css-layout': {
    intro: 'Контейнер карточек уже использует display: grid. На ширине 360 px нужна одна колонка, начиная с 768 px нужны две равные гибкие колонки. Заполни условие @media и значение grid-template-columns для широкого экрана.',
    variantIntro: 'Карточки стали шире. Теперь при 390 px должна быть одна колонка, начиная с 1024 px нужны две равные гибкие колонки. Заполни условие @media и значение grid-template-columns для широкого экрана.',
    fields: [
      { key: 'query', label: 'Условие @media', type: 'text', placeholder: '(min-width: …px)' },
      select('columns', 'Значение grid-template-columns на широком экране', [
        ['fixed', '320px 320px'], ['equal', 'repeat(2, minmax(0, 1fr))'], ['one', '1fr'], ['unequal', '2fr 1fr'],
      ]),
    ],
    async check(values, variant = false) {
      const threshold = variant ? 1024 : 768;
      const [, width] = /^(?:@media\s*)?\(\s*min-width\s*:\s*(\d+)px\s*\)$/i.exec(trimmed(values.query)) || [];
      const issues = [];
      if (Number(width) !== threshold) issues.push(`Включи второй вариант на ${threshold} px и выше. Для этого подойдёт min-width.`);
      if (values.columns !== 'equal') issues.push('Выбери два одинаковых гибких трека, чтобы они делили доступную ширину без фиксированных размеров.');
      return result(issues, `Две одинаковые гибкие колонки начнут применяться при ${threshold} px. При меньшей ширине действует базовое правило.`);
    },
  },

  'js-filter': {
    intro: 'Собери фрагмент return requests.МЕТОД(request => request.ПОЛЕ === "open"). Функция должна возвращать все открытые заявки в исходном порядке отдельным массивом. В тестовых данных есть закрытые заявки и пустой список. Тренажёр исполняет только выбранные готовые операции.',
    variantIntro: 'Теперь функция должна возвращать все закрытые заявки в порядке исходного массива. Подбери метод и поле для return requests.МЕТОД(request => request.ПОЛЕ === "closed").',
    fields: [
      select('method', 'Метод массива', [['find', 'find'], ['map', 'map'], ['filter', 'filter']]),
      select('property', 'Поле заявки', [['title', 'title'], ['status', 'status'], ['id', 'id']]),
    ],
    async check(values, variant = false) {
      const status = variant ? 'closed' : 'open';
      const method = Object.hasOwn(filterMethods, values.method) ? filterMethods[values.method] : null;
      const property = Object.hasOwn(filterProperties, values.property) ? filterProperties[values.property] : null;
      if (!method || !property) return result(['Выбери метод массива и поле заявки.']);

      const fixtures = [requests, [], [{ id: 105, title: status, status: 'draft', service_id: 2 }]];
      const outputs = fixtures.map((fixture) => method(fixture, (request) => property(request) === status));
      const expected = variant ? [102, 104] : [101, 103];
      const issues = [];
      if (!outputs.every(Array.isArray) || outputs[0].some((request) => typeof request !== 'object')) {
        issues.push('Результатом должен быть массив исходных объектов. Найди метод выбора всех элементов по условию.');
      } else if (outputs[0].length !== expected.length || outputs[0].some((request, index) => request.id !== expected[index]) || outputs[1].length || outputs[2].length) {
        issues.push('Проверь, какое поле хранит состояние заявки. В одном примере это слово встречается в названии заявки с другим статусом.');
      }
      return result(issues, `Три проверки прошли. Для смешанного списка результат содержит заявки ${expected.join(' и ')} в исходном порядке.`);
    },
  },

  'js-title': {
    intro: 'Собери normalizeTitle(value). На входе строка. Удали пробелы только по краям и сохрани регистр. Если результат содержит от 4 до 24 символов включительно, верни нормализованную строку, иначе верни null. Тренажёр исполняет только выбранные готовые операции.',
    variantIntro: 'В этой форме ограничение стало 4–30 символов включительно. Собери ту же проверку normalizeTitle(value) для нового максимума. Сохраняй регистр и содержимое внутри строки.',
    fields: [
      select('transform', 'Выражение для normalized', [['original', 'value'], ['trim', 'value.trim()'], ['lowercase', 'value.toLowerCase()']]),
      select('range', 'Условие для допустимой длины', [['exclusive', 'length > min && length < max'], ['or', 'length >= min || length <= max'], ['inclusive', 'length >= min && length <= max']]),
      { key: 'max', label: 'Верхняя граница max', type: 'number' },
    ],
    async check(values, variant = false) {
      const maximum = variant ? 30 : 24;
      const transform = Object.hasOwn(titleTransforms, values.transform) ? titleTransforms[values.transform] : null;
      const inRange = Object.hasOwn(ranges, values.range) ? ranges[values.range] : null;
      const max = Number(values.max);
      if (!transform || !inRange || !Number.isInteger(max) || max < 4 || max > 10000) {
        return result(['Заполни выражение для строки, условие диапазона и целое значение верхней границы.']);
      }

      const cases = [
        ['  Кран  ', 'Кран', 'Удали пробелы с краёв и сохрани регистр.'],
        ['  Кот  ', null, 'Строка из 3 символов после обработки должна быть недопустима.'],
        ['   ', null, 'Строка из пробелов должна быть недопустима.'],
        ['я'.repeat(maximum), 'я'.repeat(maximum), `Название длиной ${maximum} символов должно быть допустимо.`],
        ['я'.repeat(maximum + 1), null, `Название длиной ${maximum + 1} символов должно быть недопустимо.`],
      ];
      const issues = cases.flatMap(([input, expected, message]) => {
        const normalized = transform(input);
        const actual = inRange(normalized.length, 4, max) ? normalized : null;
        return actual === expected ? [] : [message];
      });
      return result(issues, `Пять проверок прошли, включая пробелы, нижнюю и верхнюю границы для 4–${maximum} символов.`);
    },
  },

  'api-reading': {
    intro: 'Запрос POST /api/requests с JSON {"title":"  кот  ","serviceId":1}. Сервер вернул HTTP 422 и JSON {"field":"title","code":"TITLE_LENGTH"}. Укажи HTTP-статус, машинный код причины и результат операции.',
    variantIntro: 'Запрос POST /api/requests с JSON {"title":"Замена крана","serviceId":1}. Сервер вернул HTTP 201 и JSON {"id":105,"title":"Замена крана","status":"open"}. Укажи HTTP-статус, идентификатор и результат операции.',
    fields: [
      { key: 'status', label: 'Числовой HTTP-статус', type: 'number' },
      { key: 'detail', label: 'Код причины ошибки или ID созданной заявки', type: 'text' },
      select('created', 'Результат операции', [['yes', 'Заявка создана'], ['no', 'Заявка не создана'], ['pending', 'Запрос принят в очередь']]),
    ],
    async check(values, variant = false) {
      const issues = [];
      if (Number(values.status) !== (variant ? 201 : 422)) issues.push('Ищи числовой статус в строке HTTP-ответа.');
      if (trimmed(values.detail) !== (variant ? '105' : 'TITLE_LENGTH')) issues.push(variant ? 'Возьми идентификатор из поля id в JSON-ответе.' : 'Возьми машинную причину из поля code в JSON-ответе.');
      if (values.created !== (variant ? 'yes' : 'no')) issues.push('Сопоставь HTTP-статус и тело ответа с результатом создания заявки.');
      return result(issues, variant ? '201 сообщает о создании ресурса, его ID в ответе 105.' : '422 означает, что содержимое запроса обработать нельзя. В учебном API поле code уточняет причину, заявка не создана.');
    },
  },

  'sql-select': {
    intro: `${sqlData}\n\nВыведи id и title открытых заявок, отсортируй по id по возрастанию. Используй SELECT, FROM, WHERE status = '…' и ORDER BY id. ${sqlLimits}`,
    variantIntro: `${sqlData}\n\nВыведи id и title закрытых заявок, отсортируй по id по убыванию. Используй SELECT, FROM, WHERE status = '…' и ORDER BY id. ${sqlLimits}`,
    fields: [sqlField],
    async check(values, variant = false) {
      const match = sqlSelectSyntax.exec(trimmed(values.query));
      if (!match) return result(['Поддерживаемый порядок частей: SELECT id, title → FROM requests → WHERE status = строка в одинарных кавычках → ORDER BY id.']);
      const [, status, order = 'asc'] = match;
      const rows = requests.filter((row) => row.status === status).sort(direction[order.toLowerCase()]);
      const ids = rows.map((row) => row.id);
      const expected = variant ? [104, 102] : [101, 103];
      const report = rows.length ? rows.map((row) => `${row.id} | ${row.title}`).join(' • ') : 'запрос не вернул строки';
      const issues = [];
      if (ids.length !== expected.length || ids.some((id, index) => id !== expected[index])) {
        issues.push(`Результат по учебным строкам: ${report}. Сверь значение status и направление сортировки с условием.`);
      }
      return result(issues, `Результат по учебным строкам: ${report}.`);
    },
  },

  'sql-join': {
    intro: `${sqlData}\n\nТаблица services (id, name). Строки\n1 | Ремонт\n2 | Уборка\n3 | Доставка\n\nВыведи services.name и количество заявок для каждой услуги, включая услуги без заявок. Начни с FROM services, свяжи services.id и requests.service_id, сгруппируй по services.id, services.name. Для количества выбери COUNT(requests.id) или COUNT(*). ${sqlLimits}`,
    variantIntro: `${sqlData}\n\nТаблица services (id, name). Строки\n1 | Ремонт\n2 | Уборка\n3 | Доставка\n\nВыведи services.name и количество заявок только для услуг, у которых заявки есть. Начни с FROM services, свяжи services.id и requests.service_id, сгруппируй по services.id, services.name. ${sqlLimits}`,
    fields: [sqlField],
    async check(values, variant = false) {
      const match = sqlJoinSyntax.exec(trimmed(values.query));
      if (!match) return result(['Проверь форму запроса: SELECT services.name, COUNT(…) FROM services [тип] JOIN requests ON … GROUP BY services.id, services.name. В ON свяжи идентификатор услуги с requests.service_id.']);

      const [, count, join = 'inner'] = match;
      const isLeft = join.toLowerCase().startsWith('left');
      const rows = services.flatMap((service) => {
        const matches = requests.filter((request) => request.service_id === service.id).length;
        if (matches) return [{ name: service.name, count: matches }];
        if (isLeft) return [{ name: service.name, count: count === '*' ? 1 : 0 }];
        return [];
      });
      const report = rows.map((row) => `${row.name} | ${row.count}`).join(' • ');
      const issues = [];
      if (isLeft === variant) issues.push(variant ? 'Используй соединение, которое оставляет только услуги с заявками.' : 'Используй соединение, сохраняющее и услуги без заявок.');
      if (isLeft && count === '*') issues.push('COUNT(*) учитывает сохранённую строку услуги даже без заявки. COUNT(requests.id) считает только строки с найденной заявкой.');
      if (issues.length) issues.unshift(`Результат по учебным строкам: ${report}.`);
      return result(issues, `Результат по учебным строкам: ${report}.`);
    },
  },

  'auto-regression': {
    intro: `Собери план небольшого регрессионного автотеста. Форма создания заявки открыта, название оставь пустым и отправь форму. Требование: появляется «${blankMessages}», а новая заявка не создаётся. Выбери устойчивый поиск поля и обе проверки результата.`,
    variantIntro: `Уточнён тестовый сценарий: используй название из трёх пробелов, а список до действия содержит произвольное число заявок. Проверь появление «${blankMessages}» и отсутствие новой заявки.`,
    fields: [
      select('locator', 'Как найти поле', [['class', 'Элемент по классу оформления .input_purple'], ['label', 'Поле по видимой подписи «Название заявки»'], ['position', 'Первое поле на странице без уточнения']]),
      select('value', 'Тестовые данные', [['valid', '«Замена крана»'], ['blank', 'Пустая строка'], ['spaces', 'Строка из трёх пробелов']]),
      select('message', 'Как проверить ошибку', [['presence', 'Текст существует где-либо в HTML'], ['visible', 'После отправки пользователю видно сообщение об ошибке'], ['timeout', 'После ожидания в одну секунду страница открыта']]),
      select('count', 'Как проверить список', [['nonempty', 'В списке есть хотя бы одна карточка'], ['same', 'Число карточек после действия равно числу до действия'], ['hardcoded', 'Число карточек после действия равно двум']]),
    ],
    async check(values, variant = false) {
      const issues = [];
      if (values.locator !== 'label') issues.push('Привяжи поиск к видимой подписи поля, чтобы косметический редизайн не менял тест.');
      if (values.value !== (variant ? 'spaces' : 'blank')) issues.push(variant ? 'Для варианта нужны именно три пробела, чтобы проверить удаление пробелов по краям.' : 'Для этого сценария введи пустую строку.');
      if (values.message !== 'visible') issues.push('Докажи, что человек реально видит сообщение после отправки.');
      if (values.count !== 'same') issues.push('Сравни число карточек до отправки и после. Начальное количество может меняться.');
      return result(issues, 'Сценарий проверяет сообщение и состояние после попытки отправки. Это проверка плана. Исполнение автотеста потребуется подтвердить в отдельной практической задаче.');
    },
  },

  'qa-title': qaTitle,
};
