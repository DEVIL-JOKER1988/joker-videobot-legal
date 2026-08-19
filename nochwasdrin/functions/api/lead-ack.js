function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'} });
}

export async function onRequestPost({ request, env }) {
  if (!env.LEADS || !env.SYNC_TOKEN) return json({ ok:false, error:'sync_not_configured' }, 503);
  if ((request.headers.get('authorization') || '') !== `Bearer ${env.SYNC_TOKEN}`) return json({ ok:false, error:'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'invalid_json' }, 400); }
  const ids = Array.isArray(body?.ids) ? body.ids.filter(x => typeof x === 'string' && x.startsWith('lead:')).slice(0,100) : [];
  if (!ids.length) return json({ ok:true, deleted:0 });
  await Promise.all(ids.map(id => env.LEADS.delete(id)));
  return json({ ok:true, deleted:ids.length });
}

export function onRequest() { return new Response('Method Not Allowed', { status:405, headers:{'allow':'POST'} }); }
