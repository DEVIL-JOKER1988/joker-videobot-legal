export async function onRequestPost({ request, env }) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (!env.LEADS) return new Response(JSON.stringify({ ok:false, error:'storage_not_configured' }), { status:503, headers });

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 20000) return new Response(JSON.stringify({ ok:false, error:'payload_too_large' }), { status:413, headers });

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ ok:false, error:'invalid_json' }), { status:400, headers }); }
  if (String(body?.website || '').trim()) return new Response(JSON.stringify({ ok:true }), { status:200, headers });

  const clean = (value, max=220) => String(value ?? '').trim().slice(0,max);
  const contact = body?.contact || {};
  const answers = body?.answers || {};
  const assessment = body?.assessment || {};

  const firstName = clean(contact.firstName, 80);
  const lastName = clean(contact.lastName, 80);
  const phone = clean(contact.phone, 40);
  const email = clean(contact.email, 160);
  const zip = clean(contact.zip, 12);
  const city = clean(contact.city, 100);
  const consent = body?.consent === true;

  if (!firstName || !lastName || !phone || !email || !zip || !city || !consent) {
    return new Response(JSON.stringify({ ok:false, error:'missing_required_fields' }), { status:400, headers });
  }

  const receivedAt = new Date().toISOString();
  const id = `lead:${Date.now()}:${crypto.randomUUID()}`;
  const level = ['red','yellow','green'].includes(clean(assessment.level, 10)) ? clean(assessment.level,10) : '';
  const scoreNum = Number(assessment.score);
  const lead = {
    id,
    receivedAt,
    source: clean(body?.source, 100) || 'nochwasdrin.pages.dev',
    pageVersion: clean(body?.pageVersion, 40),
    assessment: {
      level,
      label: clean(assessment.label, 100),
      score: Number.isFinite(scoreNum) ? Math.max(-100, Math.min(100, scoreNum)) : null
    },
    contact: { firstName, lastName, phone, email, zip, city },
    answers: {
      netIncome: clean(answers.netIncome),
      incomeType: clean(answers.incomeType),
      employmentDuration: clean(answers.employmentDuration),
      requestedAmount: clean(answers.requestedAmount),
      existingObligations: clean(answers.existingObligations),
      paymentProblems: clean(answers.paymentProblems),
      creditFile: clean(answers.creditFile),
      gamblingTransactions: clean(answers.gamblingTransactions),
      housingCosts: clean(answers.housingCosts),
      coApplicant: clean(answers.coApplicant)
    },
    consent: true
  };

  await env.LEADS.put(id, JSON.stringify(lead), { expirationTtl: 2592000 });
  return new Response(JSON.stringify({ ok:true, id, receivedAt }), { status:200, headers });
}

export function onRequest() {
  return new Response('Method Not Allowed', { status:405, headers:{'allow':'POST'} });
}
