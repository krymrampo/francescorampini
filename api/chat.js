const MAX_BODY_CHARS = 8000;
const MAX_QUESTION_CHARS = 600;

const SYSTEM_PROMPT = [
    'Sei l\'assistente digitale di Francesco Rampini, consulente di automazioni per PMI e professionisti.',
    'Rispondi in italiano, in modo semplice, pratico e rassicurante.',
    'Evita tecnicismi non necessari e frasi troppo lunghe.',
    'Quando utile, usa punti elenco brevi.',
    'Non inventare prezzi precisi: spiega da cosa dipende il costo.',
    'Non fare promesse assolute sui risultati.',
    'Se la richiesta e\' complessa, suggerisci di proseguire su WhatsApp o dal form contatti.',
    'Focus dei servizi: automazioni su misura, integrazione strumenti, gestione lead/email/preventivi/report.',
    'Chiudi con un prossimo passo concreto in una frase.'
].join(' ');

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

function extractTextFromResponse(payload) {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }

    const chunks = [];
    const output = Array.isArray(payload?.output) ? payload.output : [];
    output.forEach((item) => {
        if (item?.type !== 'message' || !Array.isArray(item?.content)) return;
        item.content.forEach((part) => {
            if (part?.type === 'output_text' && typeof part?.text === 'string') {
                chunks.push(part.text.trim());
            }
        });
    });

    return chunks.filter(Boolean).join('\n').trim();
}

export async function POST(request) {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
        return json({ ok: false, error: 'OPENAI_API_KEY non configurata' }, 503);
    }

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

        const question = String(payload?.question || '').trim();
        if (!question) {
            return json({ ok: false, error: 'La domanda e\' obbligatoria' }, 422);
        }
        if (question.length > MAX_QUESTION_CHARS) {
            return json({ ok: false, error: `Massimo ${MAX_QUESTION_CHARS} caratteri` }, 422);
        }

        const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-nano',
                instructions: SYSTEM_PROMPT,
                input: question,
                reasoning: { effort: 'minimal' },
                text: { verbosity: 'low' },
                max_output_tokens: 420
            })
        });

        if (!openAiResponse.ok) {
            const errorBody = await openAiResponse.text();
            return json(
                {
                    ok: false,
                    error: 'Errore API modello',
                    details: errorBody.slice(0, 500)
                },
                502
            );
        }

        const responsePayload = await openAiResponse.json();
        const answer = extractTextFromResponse(responsePayload);
        if (!answer) {
            return json({ ok: false, error: 'Nessuna risposta generata' }, 502);
        }

        return json({ ok: true, answer });
    } catch (_error) {
        return json({ ok: false, error: 'Errore interno endpoint chat' }, 500);
    }
}

export async function GET() {
    return json({
        ok: true,
        message: 'Endpoint chat attivo. Invia POST JSON con { "question": "..." }.'
    });
}

