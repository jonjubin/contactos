export const config = {
    runtime: 'edge', // Use Edge Runtime for speed and lower cost
};

export default async function handler(request) {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q');
        const gl = url.searchParams.get('gl');

        // Use environment variable for API Key, fallback to the hardcoded one if not set (for ease of use, though not recommended for prod)
        const apiKey = process.env.SERPAPI_KEY || 'c88bfeaf586a960801c6ed74947af053fd5c5d7ff711692e5f8c13ac87536ec6';

        if (!q || !gl) {
            return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        // Call SerpAPI
        const targetUrl = new URL('https://serpapi.com/search.json');
        targetUrl.searchParams.append('engine', 'google');
        targetUrl.searchParams.append('q', q);
        targetUrl.searchParams.append('gl', gl);
        targetUrl.searchParams.append('udm', '14');
        targetUrl.searchParams.append('filter', '0');
        targetUrl.searchParams.append('api_key', apiKey);

        const res = await fetch(targetUrl.toString());
        const data = await res.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                // Add CORS headers if you want to allow calls from other domains (optional here since it's same origin)
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
