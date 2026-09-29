'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { lessons, type Lesson } from '@/lib/curriculum';
import type { ChatMessage } from '@/lib/assistant';
import { Icon } from './icons';

function Answer({ content, onNavigate }: { content: string; onNavigate: () => void }) {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((\/learn\/[a-z0-9-]+)\)/g;
  let start = 0;
  for (const match of content.matchAll(pattern)) {
    parts.push(content.slice(start, match.index));
    const lesson = lessons.find((item) => `/learn/${item.id}` === match[2]);
    parts.push(
      lesson ? (
        <Link key={match.index} href={match[2]} onClick={onNavigate}>
          {lesson.title}
        </Link>
      ) : (
        match[1]
      ),
    );
    start = match.index! + match[0].length;
  }
  parts.push(content.slice(start));
  return <>{parts}</>;
}

export default function AiAssistant({
  lesson,
  completed,
}: {
  lesson?: Lesson;
  completed: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    conversation.current?.scrollTo({ top: conversation.current.scrollHeight });
  }, [messages, busy]);

  async function refreshModels() {
    setLoadingModels(true);
    setError('');
    try {
      const response = await fetch('/api/assistant/models', { signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load models.');
      setModels(data.models);
      let saved = '';
      try {
        saved = localStorage.getItem('lett-ai-model') || '';
      } catch {
        /* Optional preference. */
      }
      setModel((current) =>
        data.models.includes(current)
          ? current
          : data.models.includes(saved)
            ? saved
            : data.defaultModel || '',
      );
      if (!data.models.length)
        setError(
          'No local chat models found. Install a chat model in Ollama, then refresh models.',
        );
    } catch (cause) {
      setModels([]);
      setModel('');
      setError(cause instanceof Error ? cause.message : 'Could not connect to Ollama.');
    } finally {
      setLoadingModels(false);
    }
  }

  function close() {
    dialog.current?.close();
    setOpen(false);
    launcher.current?.focus();
  }

  async function send(text: string) {
    if (!text.trim() || !model || controller.current) return;
    const pending = new AbortController();
    controller.current = pending;
    const history: ChatMessage[] = [...messages.slice(-10), { role: 'user', content: text.trim() }];
    setMessages(history);
    setQuestion('');
    setBusy(true);
    setError('');
    setStatus('Thinking… The first answer may take longer while your model loads.');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([pending.signal, AbortSignal.timeout(185000)]),
        body: JSON.stringify({ model, messages: history, lessonId: lesson?.id, completed }),
      });
      const data = await response.json();
      if (controller.current !== pending) return;
      if (!response.ok) throw new Error(data.error || 'The assistant could not respond.');
      setMessages([...history, { role: 'assistant', content: data.content }]);
      setStatus('Answer ready.');
    } catch (cause) {
      if (controller.current !== pending) return;
      setMessages(history.slice(0, -1));
      setQuestion(text);
      if (pending.signal.aborted)
        setStatus('Response stopped. Your question is ready to send again.');
      else {
        setStatus('');
        setError(cause instanceof Error ? cause.message : 'Could not get an answer. Please retry.');
      }
    } finally {
      if (controller.current === pending) {
        controller.current = null;
        setBusy(false);
        if (dialog.current?.open) input.current?.focus();
      }
    }
  }

  const nextLesson = lessons.find((item) => !completed.includes(item.id));
  return (
    <>
      <button
        ref={launcher}
        className="ai-launcher button orange"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
          void refreshModels();
        }}
      >
        <Icon name="spark" size={19} /> Ask AI
      </button>
      <dialog
        ref={dialog}
        className="ai-dialog"
        aria-labelledby="ai-title"
        onCancel={close}
        onClose={() => setOpen(false)}
      >
        <header className="ai-header">
          <div>
            <p className="eyebrow">YOUR LEARNING COMPANION</p>
            <h2 id="ai-title">A little more clarity.</h2>
          </div>
          <button className="icon-button" aria-label="Close AI assistant" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="ai-context">
          <Icon name="book" size={16} />
          <span>{lesson ? `Reading: ${lesson.title}` : 'Explore your learning path'}</span>
        </div>
        <div className="ai-model-row">
          <label htmlFor="ai-model">Local model</label>
          <select
            id="ai-model"
            value={model}
            disabled={busy || loadingModels || !models.length}
            onChange={(event) => {
              setModel(event.target.value);
              try {
                localStorage.setItem('lett-ai-model', event.target.value);
              } catch {
                /* Optional preference. */
              }
            }}
          >
            {!models.length && (
              <option value="">{loadingModels ? 'Connecting…' : 'No model available'}</option>
            )}
            {models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            className="text-button"
            disabled={busy || loadingModels}
            onClick={() => void refreshModels()}
          >
            Refresh models
          </button>
        </div>
        <div
          className="ai-conversation"
          ref={conversation}
          role="log"
          aria-label="AI conversation"
          aria-live="polite"
        >
          {!messages.length && (
            <div className="ai-welcome">
              <Icon name="spark" size={30} />
              <h3>Make the lesson click.</h3>
              <p>
                Ask for a simpler explanation, work through an example, or find your next lesson.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`ai-message ai-${message.role}`}>
              <strong>{message.role === 'user' ? 'You' : 'Learning assistant'}</strong>
              <div>
                <Answer content={message.content} onNavigate={close} />
              </div>
            </div>
          ))}
        </div>
        <div className="ai-suggestions">
          {(lesson
            ? ['Explain this lesson simply', 'Give me another example', 'What should I learn next?']
            : ['Where should I start?', 'Help me understand risk']
          ).map((prompt) => (
            <button key={prompt} disabled={busy || !model} onClick={() => void send(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <div className="ai-next">
          {nextLesson ? (
            <Link href={`/learn/${nextLesson.id}`} onClick={close}>
              Next unread: {nextLesson.title} <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link href="/?view=path" onClick={close}>
              Review your learning path ↗
            </Link>
          )}
        </div>
        <p className="ai-status" role="status">
          {status}
        </p>
        {error && (
          <p className="ai-error" role="alert">
            {error}
          </p>
        )}
        <form
          className="ai-form"
          onSubmit={(event) => {
            event.preventDefault();
            void send(question);
          }}
        >
          <label htmlFor="ai-question">Ask your assistant</label>
          <textarea
            ref={input}
            id="ai-question"
            autoFocus
            rows={2}
            maxLength={2000}
            value={question}
            disabled={busy}
            placeholder="What would you like to understand?"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(question);
              }
            }}
          />
          <div className="ai-form-actions">
            <button
              type="button"
              className="text-button"
              disabled={busy || !messages.length}
              onClick={() => {
                setMessages([]);
                setError('');
                setStatus('');
              }}
            >
              New chat
            </button>
            {busy ? (
              <button
                type="button"
                className="button secondary"
                onClick={(event) => {
                  event.preventDefault();
                  const pending = controller.current;
                  controller.current = null;
                  pending?.abort();
                  setQuestion(messages.at(-1)?.content || '');
                  setMessages(messages.slice(0, -1));
                  setBusy(false);
                  setStatus('Response stopped. Your question is ready to send again.');
                }}
              >
                Stop response
              </button>
            ) : (
              <button
                className="button orange"
                disabled={!model || loadingModels || !question.trim()}
              >
                Send <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
          <p className="ai-footnote">
            Uses your lesson and progress with Ollama. Chats last for this visit. AI can make
            mistakes; use it as a study aid.
          </p>
        </form>
      </dialog>
    </>
  );
}
