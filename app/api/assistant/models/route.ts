import { connectionError, localModels } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const models = await localModels(AbortSignal.timeout(5000));
    return Response.json({
      models,
      defaultModel: models.includes(process.env.OLLAMA_MODEL || '')
        ? process.env.OLLAMA_MODEL
        : models[0],
    });
  } catch {
    return Response.json({ error: connectionError }, { status: 503 });
  }
}
