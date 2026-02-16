const MAX_BODY_CHARS = 20000;

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

function isValidIsoDate(value) {
    if (typeof value !== 'string' || value.length < 10) return false;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed);
}

function validatePayload(payload) {
    if (!payload || typeof payload !== 'object') return 'Payload JSON non valido';
    if (typeof payload.consent_id !== 'string' || payload.consent_id.trim() === '') return 'consent_id mancante';
    if (typeof payload.consent_version !== 'string' || payload.consent_version.trim() === '') return 'consent_version mancante';
    if (!payload.preferences || typeof payload.preferences !== 'object') return 'preferences mancanti';
    if (typeof payload.preferences.analytics !== 'boolean') return 'preferences.analytics deve essere boolean';
    if (typeof payload.preferences.marketing !== 'boolean') return 'preferences.marketing deve essere boolean';
    if (!isValidIsoDate(payload.updated_at)) return 'updated_at non valido';
    if (!isValidIsoDate(payload.expires_at)) return 'expires_at non valido';
    return null;
}

export async function POST(request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return json({ ok: false, error: 'Content-Type deve essere application/json' }, 415);
        }

        const rawBody = await request.text();
        if (!rawBody || rawBody.length > MAX_BODY_CHARS) {
            return json({ ok: false, error: 'Payload vuoto o troppo grande' }, 413);
        }

        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch (_error) {
            return json({ ok: false, error: 'JSON malformato' }, 400);
        }

        const validationError = validatePayload(payload);
        if (validationError) {
            return json({ ok: false, error: validationError }, 422);
        }

        const xForwardedFor = request.headers.get('x-forwarded-for') || '';
        const clientIp = xForwardedFor.split(',')[0]?.trim() || 'unknown';
        const userAgent = (request.headers.get('user-agent') || '').slice(0, 300);

        // Per test/audit: evento leggibile nei Runtime Logs di Vercel.
        console.log(JSON.stringify({
            event: 'cookie_consent',
            at: new Date().toISOString(),
            consent_id: payload.consent_id,
            consent_version: payload.consent_version,
            policy_version: payload.policy_version || '',
            source: payload.source || '',
            analytics: payload.preferences.analytics,
            marketing: payload.preferences.marketing,
            updated_at: payload.updated_at,
            expires_at: payload.expires_at,
            path: payload.page_path || '',
            referrer: payload.referrer || '',
            ip: clientIp,
            ua: userAgent
        }));

        return new Response(null, {
            status: 204,
            headers: {
                'Cache-Control': 'no-store'
            }
        });
    } catch (_error) {
        return json({ ok: false, error: 'Errore interno endpoint consenso' }, 500);
    }
}

export async function GET() {
    return json({
        ok: true,
        message: 'Endpoint consenso attivo. Invia POST JSON per registrare il consenso.'
    });
}
