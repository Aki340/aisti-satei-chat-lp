// functions/api/session.js
// POST: 回答データをKV保存 → セッションID返却 → GAS Webhook通知
// GET:  セッションIDからデータ取得（LINE Webhook用）

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const sessionId = `s_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // 1. KVに保存（30日間保持）
    if (env.SESSIONS_KV) {
      await env.SESSIONS_KV.put(sessionId, JSON.stringify(data), {
        expirationTtl: 60 * 60 * 24 * 30,
        metadata: {
          property_type: data.property_type || '',
          prefecture: data.prefecture || '',
          created: data.created_at || new Date().toISOString(),
        }
      });
    }

    // 2. GAS Webhookに通知（スプレッドシート記録 + メール通知）
    //    失敗してもユーザーへのレスポンスには影響させない
    if (env.GAS_WEBHOOK_URL) {
      try {
        await fetch(env.GAS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, ...data }),
        });
      } catch (gasErr) {
        console.error('GAS Webhook error (non-blocking):', gasErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, session_id: sessionId }),
      { status: 200, headers: CORS }
    );
  } catch (err) {
    console.error('Session save error:', err);
    return new Response(
      JSON.stringify({ success: false, session_id: '' }),
      { status: 500, headers: CORS }
    );
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('id');

  if (!sessionId || !env.SESSIONS_KV) {
    return new Response(
      JSON.stringify({ error: 'session not found' }),
      { status: 404, headers: CORS }
    );
  }

  try {
    const data = await env.SESSIONS_KV.get(sessionId);
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'session expired or not found' }),
        { status: 404, headers: CORS }
      );
    }
    return new Response(data, { status: 200, headers: CORS });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal error' }),
      { status: 500, headers: CORS }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
