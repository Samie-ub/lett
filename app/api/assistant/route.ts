import { assistantContext, type ChatMessage } from '@/lib/assistant';
import { lessons } from '@/lib/curriculum';
import { connectionError, localModels, ollamaUrl } from '@/lib/ollama';
import { isAllowedOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 60000)
      return Response.json(
        { error: 'Conversation is too long. Start a new chat.' },
        { status: 413 },
      );
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }
  if (
    !body ||
    typeof body.model !== 'string' ||
    body.model.length > 200 ||
    !Array.isArray(body.messages) ||
    body.messages.length < 1 ||
    body.messages.length > 12 ||
    !body.messages.every(
      (message: ChatMessage) =>
        message &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        message.content.length <= 8000,
    ) ||
    body.messages.at(-1).role !== 'user' ||
    (body.lessonId !== undefined && !lessons.some((lesson) => lesson.id === body.lessonId)) ||
    !Array.isArray(body.completed) ||
    body.completed.length > lessons.length ||
    !body.completed.every(
      (id: unknown) => typeof id === 'string' && lessons.some((lesson) => lesson.id === id),
    )
  ) {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(180000)]);
  try {
    const models = await localModels(AbortSignal.any([signal, AbortSignal.timeout(5000)]));
    if (!models.includes(body.model))
      return Response.json(
        { error: 'Choose an installed local chat model and retry.' },
        { status: 400 },
      );
    const response = await fetch(`${ollamaUrl()}/api/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: body.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: assistantContext(body.lessonId, body.completed, body.messages.at(-1).content),
          },
          ...body.messages,
        ],
        options: { temperature: 0.4, num_predict: 1200, num_ctx: 8192 },
      }),
    });
    if (!response.ok)
      return Response.json(
        {
          error:
            'Ollama could not answer with this model. Try another local chat model or check Ollama.',
        },
        { status: 502 },
      );
    const data = await response.json();
    if (typeof data.message?.content !== 'string' || !data.message.content.trim()) {
      return Response.json(
        { error: 'The model returned an empty answer. Try another question or model.' },
        { status: 502 },
      );
    }
    return Response.json({ content: data.message.content.slice(0, 8000) });
  } catch {
    return Response.json(
      {
        error: signal.aborted
          ? 'The response took too long or was stopped. Try a shorter question or a smaller model.'
          : connectionError,
      },
      { status: 503 },
    );
  }
}
