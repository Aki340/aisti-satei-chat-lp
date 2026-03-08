// functions/api/cities.js
// GET /api/cities?prefecture=東京都 → HeartRails GeoAPI → 市区町村一覧をJSON返却
// HeartRails APIはCORSヘッダーを返さないため、このWorkerがプロキシとして中継する

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const prefecture = url.searchParams.get('prefecture');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400', // 24時間キャッシュ
  };

  if (!prefecture) {
    return new Response(
      JSON.stringify({ error: 'prefecture parameter required' }),
      { status: 400, headers }
    );
  }

  try {
    const apiUrl = `https://geoapi.heartrails.com/api/json?method=getCities&prefecture=${encodeURIComponent(prefecture)}`;
    const res = await fetch(apiUrl, {
      cf: { cacheTtl: 86400, cacheEverything: true } // Cloudflare edge cache
    });
    const data = await res.json();

    if (!data.response || !data.response.location) {
      return new Response(
        JSON.stringify({ cities: [] }),
        { status: 200, headers }
      );
    }

    const cities = data.response.location.map(loc => loc.city);
    // 重複除去（政令指定都市の区が複数返る場合）
    const unique = [...new Set(cities)];

    return new Response(
      JSON.stringify({ cities: unique }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('HeartRails API error:', err);
    return new Response(
      JSON.stringify({ cities: [], error: 'API unavailable' }),
      { status: 200, headers } // 200で返してフロントのフォールバックに任せる
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
