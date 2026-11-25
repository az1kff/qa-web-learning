const key = 'put-v-it-workshop';
const seed = [
  { id: 101, title: 'Замена крана', status: 'open', serviceId: 1 },
  { id: 102, title: 'Уборка квартиры', status: 'closed', serviceId: 2 },
  { id: 103, title: 'Настройка роутера', status: 'open', serviceId: 1 },
  { id: 104, title: 'Уборка кухни', status: 'closed', serviceId: 2 },
];

export function createBrowserWorkshop(storage) {
  let items = structuredClone(seed);
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? 'null');
    if (Array.isArray(saved) && saved.length <= 200) items = saved;
  } catch {
    // Keep the seed if browser storage is unavailable.
  }
  function save() {
    try { storage?.setItem(key, JSON.stringify(items)); } catch { /* Keep this session usable. */ }
  }
  return (path, method, body) => {
    if (method === 'GET' && path === '/api/requests') {
      return { status: 200, data: structuredClone(items) };
    }
    if (method === 'POST' && path === '/api/requests/reset') {
      items = structuredClone(seed);
      save();
      return { status: 200, data: structuredClone(items) };
    }
    if (method === 'POST' && path === '/api/requests') {
      const raw = body?.title;
      if (typeof raw !== 'string') return { status: 422, data: { code: 'TITLE_TYPE', field: 'title' } };
      const title = raw.trim();
      const size = (body.mode === 'defect' ? raw : title).length;
      if (size < 4 || size > 24) return { status: 422, data: { code: 'TITLE_LENGTH', field: 'title' } };
      if (items.length >= 200) return { status: 409, data: { code: 'WORKSHOP_FULL' } };
      const serviceId = body.serviceId;
      if (![1, 2, 3].includes(serviceId)) return { status: 422, data: { code: 'INVALID_SERVICE' } };
      const id = Math.max(100, ...items.map(item => item.id)) + 1;
      const item = { id, title, status: 'open', serviceId };
      items.push(item);
      save();
      return { status: 201, data: { ...item } };
    }
    if (method === 'PATCH') {
      const route = /^\/api\/requests\/(\d+)$/.exec(path);
      const item = route && items.find(entry => entry.id === Number(route[1]));
      if (!item) return { status: 404, data: { code: 'REQUEST_NOT_FOUND' } };
      if (!['open', 'closed'].includes(body?.status)) return { status: 422, data: { code: 'INVALID_STATUS' } };
      item.status = body.status;
      save();
      return { status: 200, data: { ...item } };
    }
    return { status: 404, data: { code: 'REQUEST_NOT_FOUND' } };
  };
}
