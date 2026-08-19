function unauthorized() {
  return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'} });
}

export async function onRequestGet({ request, env }) {
  const headers = { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' };
  if (!env.LEADS || !env.SYNC_TOKEN) return new Response(JSON.stringify({ ok:false, error:'sync_not_configured' }), { status:503, headers });
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${env.SYNC_TOKEN}`) return unauthorized();

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const listing = await env.LEADS.list({ prefix:'lead:', limit:100, cursor });
  const leads = [];
  for (const key of listing.keys) {
    const value = await env.LEADS.get(key.name, 'json');
    if (value) leads.push(value);
  }
  return new Response(JSON.stringify({ ok:true, leads, cursor:listing.cursor || null, list_complete:listing.list_complete === true }), { status:200, headers });
}

export function onRequest() { return new Response('Method Not Allowed', { status:405, headers:{'allow':'GET'} }); }
