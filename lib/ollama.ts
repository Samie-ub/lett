export const ollamaUrl = () =>
  (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');

export async function localModels(signal: AbortSignal): Promise<string[]> {
  const response = await fetch(`${ollamaUrl()}/api/tags`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Ollama model discovery failed.');
  const data = await response.json();
  if (!Array.isArray(data.models)) throw new Error('Invalid Ollama model list.');
  return data.models
    .filter(
      (model: { name?: unknown; remote_host?: string; capabilities?: string[] }) =>
        typeof model.name === 'string' &&
        !model.remote_host &&
        !model.name.endsWith(':cloud') &&
        (!model.capabilities || model.capabilities.includes('completion')) &&
        !/embed|bge-|nomic-/i.test(model.name),
    )
    .map((model: { name: string }) => model.name);
}

export const connectionError =
  'Could not reach Ollama. Open the Ollama app or run ollama serve on the machine running lett., then retry.';
