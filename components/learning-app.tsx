'use client';
import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lessons, phases, sources, checkpoints, type Lesson } from '@/lib/curriculum';
import {
  emptyData,
  isLearningData,
  STORAGE_KEY,
  dayKey,
  streak,
  downloadFile,
  type LearningData,
  type Note,
  type Activity,
} from '@/lib/storage';
import { Icon, Illustration } from './icons';
import AiAssistant from './ai-assistant';
const navigation = [
  ['dashboard', 'home', 'Overview'],
  ['path', 'path', 'Learning path'],
  ['notes', 'note', 'My notebook'],
  ['history', 'history', 'History'],
  ['progress', 'progress', 'My progress'],
  ['resources', 'book', 'Resources'],
];
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const lessonHref = (id: string) => `/learn/${id}`;
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function Empty({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
export default function LearningApp({
  initialLesson,
  initialView = 'dashboard',
}: {
  initialLesson?: string;
  initialView?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<LearningData>(emptyData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [theme, setTheme] = useState('system');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState(-1);
  const [noteQuery, setNoteQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [deletedNote, setDeletedNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState<{
    id?: string;
    lessonId?: string;
    quote: string;
    text: string;
  } | null>(null);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checkedAnswer, setCheckedAnswer] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const saveAllowed = useRef(true);
  const draftOrigin = useRef<HTMLElement | null>(null);
  const importedFile = useRef<HTMLInputElement>(null);
  const view =
    navigation.some((n) => n[0] === initialView) || initialView === 'settings'
      ? initialView
      : 'dashboard';
  const lesson = lessons.find((l) => l.id === initialLesson);
  const currentPhase = lesson ? phases[lesson.phase] : undefined;
  const completedCount = data.completed.filter((id) => lessons.some((l) => l.id === id)).length;
  const percent = Math.round((completedCount / lessons.length) * 100);
  const nextLesson = lessons.find((l) => !data.completed.includes(l.id)) || lessons[0];
  const resumeLesson =
    lessons.find((l) => l.id === data.lastLesson && !data.completed.includes(l.id)) || nextLesson;
  const activePhase = phases[resumeLesson.phase];
  const phaseLessons = lessons.filter((l) => l.phase === activePhase.id);
  const doneInPhase = phaseLessons.filter((l) => data.completed.includes(l.id)).length;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!isLearningData(parsed)) throw new Error('Invalid saved data');
        setData(parsed);
      }
      const savedTheme = localStorage.getItem('lett-theme');
      setTheme(
        savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system',
      );
    } catch {
      saveAllowed.current = false;
      setStorageError(
        'Saved data could not be read. Your existing storage has been left untouched. You can restore a backup in Settings.',
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !saveAllowed.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError('');
    } catch {
      setStorageError(
        'This browser could not save your changes. Keep this page open and export a backup from Settings.',
      );
    }
  }, [data, ready]);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);
    apply();
    try {
      localStorage.setItem('lett-theme', theme);
    } catch {
      setToast('Appearance changed for this visit; browser storage is unavailable.');
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, ready]);
  useEffect(() => {
    if (ready && lesson) {
      const saved = data.quiz[lesson.phase];
      if (saved !== undefined) {
        setSelectedAnswer(saved);
        setCheckedAnswer(true);
      }
    }
  }, [ready, initialLesson]);
  useEffect(() => {
    if (!ready || !initialLesson) return;
    setData((d) => {
      const last = d.history[0];
      if (
        last?.type === 'read' &&
        last.lessonId === initialLesson &&
        Date.now() - Date.parse(last.at) < 60000
      )
        return d;
      return {
        ...d,
        lastLesson: initialLesson,
        history: [
          {
            id: crypto.randomUUID(),
            type: 'read',
            lessonId: initialLesson,
            at: new Date().toISOString(),
          },
          ...d.history,
        ],
      };
    });
  }, [initialLesson, ready]);
  useEffect(() => {
    const saved = lesson ? data.quiz[lesson.phase] : undefined;
    setSelectedAnswer(saved ?? null);
    setCheckedAnswer(saved !== undefined);
    setSelection(null);
    setMobileNav(false);
    setQuery('');
    setSearchOpen(false);
  }, [initialLesson, initialView]);
  useEffect(() => {
    const media = matchMedia('(max-width: 800px)');
    const update = () => {
      setIsNarrow(media.matches);
      if (!media.matches) setMobileNav(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobileNav || !isNarrow) return;
    const nav = sidebarRef.current;
    const controls = () =>
      Array.from(nav?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []);
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', trap);
      document.body.style.overflow = overflow;
      menuRef.current?.focus();
    };
  }, [mobileNav, isNarrow]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), toast === 'Note deleted.' ? 10000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal();
  }, [draft]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileNav(false);
        setSelection(null);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    const modal = searchDialog.current;
    if (!searchOpen) {
      modal?.close();
      return;
    }
    modal?.showModal();
    searchRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      modal?.close();
      document.body.style.overflow = overflow;
    };
  }, [searchOpen]);
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem('lett-sidebar-collapsed') === 'true');
    } catch {
      // The sidebar remains usable when browser storage is unavailable.
    }
  }, []);
  const toggleSidebar = () => {
    const collapsed = !sidebarCollapsed;
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('lett-sidebar-collapsed', String(collapsed));
    } catch {
      // Keep the preference for this visit.
    }
  };
  const captureSelection = useCallback(() => {
    const selected = window.getSelection();
    if (
      !selected ||
      selected.isCollapsed ||
      !articleRef.current?.contains(selected.anchorNode) ||
      !articleRef.current?.contains(selected.focusNode)
    ) {
      setSelection(null);
      return;
    }
    const text = selected.toString().trim();
    if (text.length < 3) {
      setSelection(null);
      return;
    }
    const rect = selected.getRangeAt(0).getBoundingClientRect();
    setSelection({
      text,
      x: Math.max(12, Math.min(rect.left + rect.width / 2 - 85, window.innerWidth - 185)),
      y: Math.max(12, Math.min(rect.top - 48, window.innerHeight - 60)),
    });
  }, []);
  useEffect(() => {
    if (!lesson) return;
    document.addEventListener('selectionchange', captureSelection);
    const clear = () => setSelection(null);
    window.addEventListener('scroll', clear, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', captureSelection);
      window.removeEventListener('scroll', clear);
    };
  }, [lesson, captureSelection]);
  const openDraft = (quote = '', lessonId?: string, note?: Note) => {
    draftOrigin.current = document.activeElement as HTMLElement;
    setDraft(
      note
        ? { id: note.id, lessonId: note.lessonId, quote: note.quote, text: note.text }
        : { quote, lessonId, text: '' },
    );
    setSelection(null);
  };
  const closeDraft = () => {
    dialog.current?.close();
    setDraft(null);
    draftOrigin.current?.focus();
  };
  const saveNote = () => {
    if (!draft || (!draft.text.trim() && !draft.quote.trim())) return;
    const now = new Date().toISOString();
    setData((d) => ({
      ...d,
      notes: draft.id
        ? d.notes.map((n) =>
            n.id === draft.id ? { ...n, text: draft.text.trim(), updatedAt: now } : n,
          )
        : [
            {
              ...draft,
              text: draft.text.trim(),
              id: crypto.randomUUID(),
              createdAt: now,
              updatedAt: now,
            },
            ...d.notes,
          ],
      history: draft.id
        ? d.history
        : [
            { id: crypto.randomUUID(), type: 'note', lessonId: draft.lessonId, at: now },
            ...d.history,
          ],
    }));
    closeDraft();
    setToast(draft.id ? 'Note updated.' : 'Saved to your notebook.');
  };
  const completeLesson = () => {
    if (!lesson) return;
    const wasComplete = data.completed.includes(lesson.id);
    setData((d) => ({
      ...d,
      completed: wasComplete
        ? d.completed.filter((id) => id !== lesson.id)
        : [...d.completed, lesson.id],
      history: wasComplete
        ? d.history
        : [
            {
              id: crypto.randomUUID(),
              type: 'complete',
              lessonId: lesson.id,
              at: new Date().toISOString(),
            },
            ...d.history,
          ],
    }));
    setToast(
      wasComplete
        ? 'Lesson marked as not completed.'
        : 'Lesson complete. A little more confident, one step at a time.',
    );
  };
  const searchResults = query.trim()
    ? lessons
        .filter((l) =>
          (l.title + ' ' + l.explanation + ' ' + phases[l.phase].title)
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
        )
        .sort(
          (a, b) =>
            Number(b.title.toLowerCase().includes(query.toLowerCase().trim())) -
            Number(a.title.toLowerCase().includes(query.toLowerCase().trim())),
        )
        .slice(0, 7)
    : [];
  const renderLessonRow = (l: Lesson, index: number) => {
    const done = data.completed.includes(l.id);
    return (
      <Link href={lessonHref(l.id)} className="lesson-row" key={l.id}>
        <span className={`lesson-number ${done ? 'done' : ''}`}>
          {done ? <Icon name="check" size={17} /> : String(index + 1).padStart(2, '0')}
        </span>
        <span className="lesson-row-text">
          <strong>{l.title}</strong>
          <span>
            {l.minutes} min read
            {done
              ? ' · Completed'
              : data.history.some((h) => h.lessonId === l.id)
                ? ' · Previously opened'
                : ''}
          </span>
        </span>
        <Icon name="arrow" size={18} />
      </Link>
    );
  };
  const activityDays = new Set(data.history.map((h) => dayKey(new Date(h.at))));
  function Week() {
    if (!ready)
      return <div className="week week-placeholder" aria-label="Loading this week’s activity" />;
    return (
      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + i);
          const today = dayKey(day) === dayKey(new Date());
          const active = activityDays.has(dayKey(day));
          return (
            <div key={i} className={`week-day ${today ? 'today' : ''}`}>
              <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              <span
                className={active ? 'day-circle active' : 'day-circle'}
                aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${active ? 'activity recorded' : 'no activity'}${today ? ', today' : ''}`}
              >
                {active ? <Icon name="check" size={15} /> : day.getDate()}
              </span>
              {today && <i />}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        id="learning-sidebar"
        ref={sidebarRef}
        className={`sidebar ${mobileNav ? 'is-open' : ''}`}
        inert={isNarrow && !mobileNav}
        role={isNarrow && mobileNav ? 'dialog' : undefined}
        aria-modal={isNarrow && mobileNav ? true : undefined}
        aria-label="Learning navigation"
      >
        <button
          className="icon-button mobile-nav-close"
          aria-label="Close navigation menu"
          onClick={() => setMobileNav(false)}
        >
          <Icon name="close" />
        </button>
        <Link className="brand" href="/" aria-label="lett. home">
          lett<span>.</span>
          <span className="brand-spark">✳</span>
        </Link>
        <Link className="compact-brand" href="/" aria-label="lett. home" title="lett. home">
          <Icon name="spark" size={24} />
        </Link>
        <p className="brand-caption">A little wiser. Every day.</p>
        <div className="nav-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(([key, icon, label]) => (
            <Link
              key={key}
              aria-label={label}
              title={label}
              href={key === 'dashboard' ? '/' : `/?view=${key}`}
              className={`nav-item ${!lesson && view === key ? 'active' : ''}`}
              aria-current={!lesson && view === key ? 'page' : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {key === 'notes' && data.notes.length > 0 && (
                <span className="nav-count">{data.notes.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/?view=settings"
            aria-label="Settings"
            title="Settings"
            className={`nav-item ${view === 'settings' && !lesson ? 'active' : ''}`}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </Link>
          <div className="theme-switch" role="group" aria-label="Color theme">
            {['light', 'dark', 'system'].map((t) => (
              <button
                key={t}
                aria-label={`${t[0].toUpperCase() + t.slice(1)} theme`}
                title={`${t[0].toUpperCase() + t.slice(1)} theme`}
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
              >
                <Icon name={t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'system'} size={17} />
              </button>
            ))}
          </div>
        </div>
      </aside>
      <button
        className="sidebar-toggle"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
        aria-controls="learning-sidebar"
        onClick={toggleSidebar}
      >
        <Icon name="sidebar" size={16} />
      </button>
      <div className="main-shell" inert={isNarrow && mobileNav}>
        <header className="progress-header" aria-label="Your learning summary">
          <button
            className="back-control"
            aria-label="Go back"
            title="Go back"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push('/');
            }}
          >
            <Icon name="arrow" size={18} />
          </button>
          <button
            ref={menuRef}
            className="icon-button mobile-menu"
            aria-expanded={mobileNav}
            aria-label="Open navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Icon name="menu" />
          </button>
          <div className="compact-stats">
            <div>
              <span className="stat-icon">
                <Icon name="book" />
              </span>
              <span>
                <strong>
                  {completedCount}
                  <small> / {lessons.length}</small>
                </strong>
                <p>Lessons completed</p>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <Icon name="path" />
              </span>
              <span>
                <strong>
                  {
                    phases.filter((p) =>
                      lessons
                        .filter((l) => l.phase === p.id)
                        .every((l) => data.completed.includes(l.id)),
                    ).length
                  }
                  <small> / 7</small>
                </strong>
                <p>Phases explored fully</p>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <Icon name="note" />
              </span>
              <span>
                <strong>{data.notes.length.toString().padStart(2, '0')}</strong>
                <p>Ideas in your notebook</p>
              </span>
            </div>
            <div className="overall-progress">
              <div>
                <span>YOUR PROGRESS</span>
                <strong>{percent}%</strong>
              </div>
              <Progress value={percent} label="Overall curriculum completion" />
            </div>
            <div className="summary-streak">
              <span className="streak-pill">
                <Icon name="flame" size={16} />
                <strong>{streak(data.history)}</strong> day streak
              </span>
            </div>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={lesson ? 'main-content reading-main' : 'main-content'}
        >
          {storageError && (
            <div className="storage-warning" role="alert">
              {storageError} <Link href="/?view=settings">Open Settings</Link>
            </div>
          )}
          {!lesson && view === 'dashboard' && (
            <>
              <section className="hero" aria-labelledby="hero-title">
                <div className="hero-copy">
                  <span className="hero-eyebrow">
                    <span /> LEARN FIRST. TRADE THOUGHTFULLY.
                  </span>
                  <h1 id="hero-title">
                    Less noise.
                    <br />
                    More <span>understanding.</span>
                  </h1>
                  <p>
                    You don’t need to know everything.
                    <br />
                    Just start with the next right lesson.
                  </p>
                  <Link className="button orange" href={lessonHref(resumeLesson.id)}>
                    {data.lastLesson ? 'Continue learning' : 'Start learning'}
                    <Icon name="diagonal" size={18} />
                  </Link>
                  <span className="hero-footnote">
                    7 phases. 61 lessons. A stronger foundation.
                  </span>
                </div>
                <div className="hero-cards">
                  <Link href={lessonHref(lessons[0].id)} className="hero-card cream">
                    <span>
                      PHASE 00 <Icon name="diagonal" size={15} />
                    </span>
                    <h3>
                      It starts with
                      <br />a mindset.
                    </h3>
                    <Illustration kind="steps" />
                    <small>Understand the game</small>
                  </Link>
                  <Link
                    href={lessonHref(lessons.find((l) => l.phase === 1)!.id)}
                    className="hero-card coral"
                  >
                    <span>
                      PHASE 01 <Icon name="diagonal" size={15} />
                    </span>
                    <h3>
                      Meet the
                      <br />
                      market.
                    </h3>
                    <Illustration kind="globe" />
                    <small>Learn the fundamentals</small>
                  </Link>
                  <Link
                    href={lessonHref(lessons.find((l) => l.phase === 2)!.id)}
                    className="hero-card lilac"
                  >
                    <span>
                      PHASE 02 <Icon name="diagonal" size={15} />
                    </span>
                    <h3>
                      Read between
                      <br />
                      the candles.
                    </h3>
                    <Illustration kind="candles" />
                    <small>Make sense of the charts</small>
                  </Link>
                </div>
              </section>
              <div className="dashboard-grid">
                <section className="current-learning">
                  <div className="section-heading">
                    <h2>
                      {data.lastLesson ? 'Pick up where you left off' : 'Your starting point'}
                    </h2>
                    <Link className="text-link" href="/?view=path">
                      View learning path <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                  <div className="phase-heading">
                    <div className="phase-icon">
                      <Icon name="spark" size={25} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        PHASE {String(activePhase.id).padStart(2, '0')}
                      </span>
                      <h3>{activePhase.title}</h3>
                      <p>{activePhase.description}</p>
                    </div>
                    <span className="phase-count">
                      {doneInPhase} / {phaseLessons.length}
                    </span>
                  </div>
                  <div className="lesson-list">{phaseLessons.slice(0, 5).map(renderLessonRow)}</div>
                  {phaseLessons.length > 5 && (
                    <Link className="all-lessons" href="/?view=path">
                      Explore all {phaseLessons.length} lessons in this phase{' '}
                      <Icon name="arrow" size={16} />
                    </Link>
                  )}
                </section>
                <aside className="dashboard-rail">
                  <section className="consistency-card">
                    <div className="section-heading">
                      <h2>A little, often.</h2>
                      <Icon name="sun" size={20} />
                    </div>
                    <p>Make room for a moment of learning.</p>
                    <Week />
                    <div className="week-footer">
                      <span className="small-orange-dot" />
                      {streak(data.history)
                        ? `${streak(data.history)} day${streak(data.history) > 1 ? 's' : ''} of showing up. Keep going.`
                        : 'Your first step can be today.'}
                    </div>
                  </section>
                  <section className="notebook-tip">
                    <div className="tip-top">
                      <Icon name="note" />
                      <span>MAKE IT YOURS</span>
                      <Icon name="diagonal" size={18} />
                    </div>
                    <h3>
                      A good idea?
                      <br />
                      Keep it close.
                    </h3>
                    <p>Highlight any passage in a lesson to save it to your notebook.</p>
                    <Link href="/?view=notes" className="text-link">
                      Open my notebook <Icon name="arrow" size={16} />
                    </Link>
                    <div className="mock-selection" aria-hidden="true">
                      Understanding comes before action.
                      <span>
                        <Icon name="plus" size={12} /> Save to notes
                      </span>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
          {!lesson && view === 'path' && (
            <>
              <PageTitle
                eyebrow="ONE STEP AT A TIME"
                title="Your learning path."
                description="Seven phases to build your understanding. Start at the beginning or follow your curiosity."
              />
              <div className="path-summary">
                <span>
                  <strong>{completedCount}</strong> of {lessons.length} lessons completed
                </span>
                <Progress value={percent} label="Curriculum progress" />
                <span>{percent}%</span>
              </div>
              <div className="filter-row" role="group" aria-label="Filter phases">
                <button
                  className={phaseFilter === -1 ? 'selected' : ''}
                  onClick={() => setPhaseFilter(-1)}
                >
                  All phases
                </button>
                {phases.map((p) => (
                  <button
                    key={p.id}
                    className={phaseFilter === p.id ? 'selected' : ''}
                    onClick={() => setPhaseFilter(p.id)}
                  >
                    Phase {p.id}
                  </button>
                ))}
              </div>
              <div className="curriculum-grid">
                {phases
                  .filter((p) => phaseFilter < 0 || p.id === phaseFilter)
                  .map((p) => {
                    const items = lessons.filter((l) => l.phase === p.id);
                    const done = items.filter((l) => data.completed.includes(l.id)).length;
                    return (
                      <section className="curriculum-card" key={p.id}>
                        <div className={`curriculum-banner color-${p.id % 3}`}>
                          <div>
                            <span className="eyebrow">PHASE {String(p.id).padStart(2, '0')}</span>
                            <h2>{p.title}</h2>
                            <p>{p.tag}</p>
                          </div>
                          <Illustration kind={p.art} />
                        </div>
                        <div className="curriculum-meta">
                          <span>
                            {items.length} lessons · {items.reduce((s, l) => s + l.minutes, 0)} min
                            + practice
                          </span>
                          <span>
                            {done}/{items.length} complete
                          </span>
                        </div>
                        <p className="curriculum-description">{p.description}</p>
                        <div className="lesson-list">{items.map(renderLessonRow)}</div>
                      </section>
                    );
                  })}
              </div>
            </>
          )}
          {lesson && currentPhase && (
            <>
              <div className="reader-breadcrumb">
                <Link href="/?view=path">Learning path</Link>
                <Icon name="chevron" size={14} />
                <span>
                  Phase {lesson.phase} · {currentPhase.title}
                </span>
              </div>
              <div className="reader-layout">
                <article className="reader">
                  <div className="reader-header">
                    <span className="eyebrow">
                      LESSON{' '}
                      {String(
                        lessons.filter((l) => l.phase === lesson.phase).indexOf(lesson) + 1,
                      ).padStart(2, '0')}{' '}
                      / {lessons.filter((l) => l.phase === lesson.phase).length}
                    </span>
                    <h1>{lesson.title}</h1>
                    <div className="reader-meta">
                      <span>
                        <Icon name="clock" size={15} />
                        {lesson.minutes} min read
                      </span>
                      <span>Beginner friendly</span>
                      {data.completed.includes(lesson.id) && (
                        <span className="completed-label">
                          <Icon name="check" size={15} /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="selection-hint">
                    <Icon name="note" size={17} />
                    <span>
                      Select a passage to save it, or use the “Save takeaway” button below.
                    </span>
                  </div>
                  <div
                    ref={articleRef}
                    className="article-body"
                    style={{ '--reading-size': `${data.fontSize}px` } as CSSProperties}
                    tabIndex={0}
                    aria-label="Lesson text; select a passage to save it"
                  >
                    <h2>The simple idea</h2>
                    <p>{lesson.explanation}</p>
                    {lesson.id === 'what-is-a-market' && (
                      <div
                        className="market-diagram"
                        role="img"
                        aria-label="Buyer offers $100. Seller asks $120. They agree at $110, and a trade happens."
                      >
                        <div>
                          <Icon name="book" size={24} />
                          <strong>The buyer</strong>
                          <span>“I’ll offer $100.”</span>
                        </div>
                        <div className="agreement">
                          <span>A SHARED PRICE</span>
                          <strong>$110</strong>
                          <span>It’s a trade.</span>
                        </div>
                        <div>
                          <Icon name="note" size={24} />
                          <strong>The seller</strong>
                          <span>“I’m asking $120.”</span>
                        </div>
                      </div>
                    )}
                    <section className="example-box">
                      <span className="eyebrow">
                        <Icon name="sun" size={18} /> LET’S MAKE IT REAL
                      </span>
                      <h2>
                        {lesson.id === 'what-is-a-market'
                          ? 'A bicycle. Two people. One agreement.'
                          : 'A simple example'}
                      </h2>
                      <p>{lesson.example}</p>
                      <small>
                        Illustrative example · Figures are hypothetical and exclude costs unless
                        stated.
                      </small>
                    </section>
                    <h2>One thing to remember</h2>
                    <blockquote>{lesson.takeaway}</blockquote>
                  </div>
                  <button
                    className="text-link save-takeaway"
                    onClick={() => openDraft(lesson.takeaway, lesson.id)}
                  >
                    <Icon name="plus" size={17} /> Save takeaway to notebook
                  </button>
                  {lessons.filter((l) => l.phase === lesson.phase).at(-1)?.id === lesson.id && (
                    <section className="checkpoint">
                      <span className="eyebrow">PHASE CHECKPOINT</span>
                      <h2>Let’s connect the dots.</h2>
                      <fieldset>
                        <legend>{checkpoints[lesson.phase].question}</legend>
                        {checkpoints[lesson.phase].options.map((option, i) => (
                          <label key={option}>
                            <input
                              type="radio"
                              name="checkpoint"
                              checked={selectedAnswer === i}
                              onChange={() => {
                                setSelectedAnswer(i);
                                setCheckedAnswer(false);
                              }}
                            />
                            {option}
                          </label>
                        ))}
                      </fieldset>
                      <button
                        className="button secondary small"
                        disabled={selectedAnswer === null}
                        onClick={() => {
                          setCheckedAnswer(true);
                          setData((d) => ({
                            ...d,
                            quiz: { ...d.quiz, [lesson.phase]: selectedAnswer! },
                          }));
                        }}
                      >
                        Check answer <Icon name="arrow" size={16} />
                      </button>
                      {checkedAnswer && (
                        <p className="quiz-feedback" role="status">
                          <strong>
                            {selectedAnswer === checkpoints[lesson.phase].answer
                              ? 'That’s right.'
                              : 'Take another look.'}
                          </strong>{' '}
                          {checkpoints[lesson.phase].explanation}
                        </p>
                      )}
                    </section>
                  )}
                  <section className="lesson-sources">
                    <span className="eyebrow">GO A LITTLE DEEPER</span>
                    <h2>Sources & further reading</h2>
                    <a href={sources[lesson.source].url} target="_blank" rel="noreferrer">
                      <span>
                        <strong>{sources[lesson.source].name}</strong>
                        {sources[lesson.source].title}
                      </span>
                      <Icon name="diagonal" size={18} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </section>
                  <div className="reader-actions">
                    <button
                      className={`button ${data.completed.includes(lesson.id) ? 'secondary' : 'orange'}`}
                      onClick={completeLesson}
                    >
                      <Icon name="check" size={18} />
                      {data.completed.includes(lesson.id)
                        ? 'Completed · mark as unread'
                        : 'Mark lesson complete'}
                    </button>
                    {lessons[lessons.indexOf(lesson) + 1] && (
                      <Link
                        className="text-link"
                        href={lessonHref(lessons[lessons.indexOf(lesson) + 1].id)}
                      >
                        Next lesson <Icon name="arrow" size={18} />
                      </Link>
                    )}
                  </div>
                </article>
                <aside className="reader-sidebar">
                  <span className="eyebrow">IN THIS PHASE</span>
                  <h2>{currentPhase.title}</h2>
                  <div className="reader-phase-list">
                    {lessons
                      .filter((l) => l.phase === lesson.phase)
                      .map((l, i) => (
                        <Link
                          key={l.id}
                          href={lessonHref(l.id)}
                          aria-current={l.id === lesson.id ? 'page' : undefined}
                        >
                          <span>
                            {data.completed.includes(l.id) ? (
                              <Icon name="check" size={15} />
                            ) : (
                              String(i + 1).padStart(2, '0')
                            )}
                          </span>
                          {l.title}
                        </Link>
                      ))}
                  </div>
                  <div className="reader-notes">
                    <Icon name="note" />
                    <h3>Make room for your ideas.</h3>
                    <p>
                      {data.notes.filter((n) => n.lessonId === lesson.id).length} notes saved from
                      this lesson.
                    </p>
                    <button className="text-link" onClick={() => openDraft('', lesson.id)}>
                      Add a note <Icon name="plus" size={16} />
                    </button>
                  </div>
                </aside>
              </div>
            </>
          )}
          {!lesson && view === 'notes' && (
            <>
              <PageTitle
                eyebrow="YOUR IDEAS, IN ONE PLACE"
                title="A notebook for the journey."
                description="The passages that clicked. The questions worth asking. Your words, too."
                action={
                  <button className="button orange" onClick={() => openDraft()}>
                    <Icon name="plus" size={18} /> New note
                  </button>
                }
              />
              <div className="notebook-tools">
                <label>
                  <Icon name="search" size={18} />
                  <input
                    aria-label="Search your notes"
                    placeholder="Search your notebook…"
                    value={noteQuery}
                    onChange={(e) => setNoteQuery(e.target.value)}
                  />
                </label>
                <span>
                  {data.notes.length} saved {data.notes.length === 1 ? 'note' : 'notes'}
                </span>
                <button
                  className="text-link"
                  disabled={!data.notes.length}
                  onClick={() =>
                    downloadFile(
                      data.notes
                        .map(
                          (n) =>
                            `## ${lessons.find((l) => l.id === n.lessonId)?.title || 'Personal note'}\n${dateLabel(n.createdAt)}\n\n${n.quote ? '> ' + n.quote.replace(/\n/g, '\n> ') + '\n\n' : ''}${n.text}\n`,
                        )
                        .join('\n---\n\n'),
                      'lett-notebook.md',
                      'text/markdown',
                    )
                  }
                >
                  <Icon name="download" size={16} /> Export notes
                </button>
              </div>
              {data.notes.length === 0 ? (
                <Empty icon="note" title="Your next good idea belongs here.">
                  <p>
                    Highlight a passage while reading, save a takeaway,
                    <br />
                    or start with a thought of your own.
                  </p>
                  <Link className="button secondary" href={lessonHref(resumeLesson.id)}>
                    Explore a lesson <Icon name="arrow" size={17} />
                  </Link>
                </Empty>
              ) : (
                <div className="notes-grid">
                  {data.notes
                    .filter((n) =>
                      (
                        n.quote +
                        ' ' +
                        n.text +
                        ' ' +
                        lessons.find((l) => l.id === n.lessonId)?.title
                      )
                        .toLowerCase()
                        .includes(noteQuery.toLowerCase()),
                    )
                    .map((n) => (
                      <article key={n.id} className="note-card">
                        <div className="note-card-header">
                          <span>
                            <Icon name="note" size={15} /> {dateLabel(n.createdAt)}
                          </span>
                          <div>
                            <button
                              className="icon-button"
                              aria-label="Edit note"
                              onClick={() => openDraft('', undefined, n)}
                            >
                              <Icon name="note" size={16} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="Delete note"
                              onClick={() => {
                                setData((d) => ({
                                  ...d,
                                  notes: d.notes.filter((item) => item.id !== n.id),
                                }));
                                setDeletedNote(n);
                                setToast('Note deleted.');
                              }}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        </div>
                        {n.quote && <blockquote>{n.quote}</blockquote>}
                        {n.text && <p className="note-text">{n.text}</p>}
                        {n.lessonId ? (
                          <Link className="note-source" href={lessonHref(n.lessonId)}>
                            {lessons.find((l) => l.id === n.lessonId)?.title || 'Open lesson'}
                            <Icon name="diagonal" size={15} />
                          </Link>
                        ) : (
                          <span className="note-source">Personal note</span>
                        )}
                      </article>
                    ))}
                  {!data.notes.some((n) =>
                    (n.quote + ' ' + n.text + ' ' + lessons.find((l) => l.id === n.lessonId)?.title)
                      .toLowerCase()
                      .includes(noteQuery.toLowerCase()),
                  ) && <p>No notes match “{noteQuery}”. Try another word.</p>}
                </div>
              )}
            </>
          )}
          {!lesson && view === 'history' && (
            <>
              <PageTitle
                eyebrow="LOOK HOW FAR YOU’VE COME"
                title="Your learning, remembered."
                description="A quiet record of the lessons you opened, completed, and made your own."
              />
              <div className="filter-row" role="group" aria-label="Filter history">
                {[
                  ['all', 'All activity'],
                  ['read', 'Lessons opened'],
                  ['complete', 'Completed'],
                  ['note', 'Notes saved'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setHistoryFilter(id)}
                    className={historyFilter === id ? 'selected' : ''}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {!data.history.filter((h) => historyFilter === 'all' || h.type === historyFilter)
                .length ? (
                <Empty icon="history" title="A fresh page in your story.">
                  <p>Your learning activity will appear here.</p>
                  <Link className="text-link" href={lessonHref(resumeLesson.id)}>
                    Start a lesson <Icon name="arrow" size={16} />
                  </Link>
                </Empty>
              ) : (
                <div className="history-list">
                  {data.history
                    .filter((h) => historyFilter === 'all' || h.type === historyFilter)
                    .map((h) => (
                      <div className="history-row" key={h.id}>
                        <span className={`history-icon ${h.type}`}>
                          <Icon
                            name={
                              h.type === 'complete' ? 'check' : h.type === 'read' ? 'book' : 'note'
                            }
                            size={20}
                          />
                        </span>
                        <div>
                          <span>
                            {h.type === 'read'
                              ? 'Opened a lesson'
                              : h.type === 'complete'
                                ? 'Completed a lesson'
                                : 'Saved a note'}
                          </span>
                          {h.lessonId ? (
                            <Link href={lessonHref(h.lessonId)}>
                              {lessons.find((l) => l.id === h.lessonId)?.title || 'Lesson'}
                            </Link>
                          ) : (
                            <strong>Personal notebook</strong>
                          )}
                        </div>
                        <time dateTime={h.at}>
                          {dateLabel(h.at)}
                          <small>
                            {new Date(h.at).toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </small>
                        </time>
                        {h.lessonId && (
                          <Link aria-label="Open lesson from history" href={lessonHref(h.lessonId)}>
                            <Icon name="arrow" size={18} />
                          </Link>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
          {!lesson && view === 'progress' && (
            <>
              <PageTitle
                eyebrow="PROGRESS, NOT PERFECTION"
                title="Every little bit adds up."
                description="A lesson understood is a step forward. There’s no finish-line rush."
              />
              <div className="progress-overview">
                <div
                  className="progress-ring"
                  style={{ '--percent': `${percent}%` } as CSSProperties}
                >
                  <div>
                    <strong>{percent}%</strong>
                    <span>of your journey</span>
                  </div>
                </div>
                <div>
                  <h2>
                    {completedCount} {completedCount === 1 ? 'lesson' : 'lessons'}.{' '}
                    {completedCount ? 'A little more perspective.' : 'A fresh beginning.'}
                  </h2>
                  <p>
                    {lessons.length - completedCount} lessons left to explore across seven phases.
                  </p>
                  <Link className="button orange" href={lessonHref(resumeLesson.id)}>
                    Take the next step <Icon name="arrow" size={18} />
                  </Link>
                </div>
                <div className="progress-streak">
                  <Icon name="flame" size={26} />
                  <strong>{streak(data.history)}</strong>
                  <span>day learning streak</span>
                </div>
              </div>
              <div className="phase-progress-list">
                {phases.map((p) => {
                  const items = lessons.filter((l) => l.phase === p.id);
                  const done = items.filter((l) => data.completed.includes(l.id)).length;
                  return (
                    <Link
                      key={p.id}
                      href={lessonHref(
                        items.find((l) => !data.completed.includes(l.id))?.id || items[0].id,
                      )}
                    >
                      <span className="phase-progress-number">0{p.id}</span>
                      <div>
                        <h2>{p.title}</h2>
                        <Progress
                          value={Math.round((done / items.length) * 100)}
                          label={`${p.title} completion`}
                        />
                      </div>
                      <span>
                        {done} / {items.length} lessons
                      </span>
                      <Icon name="arrow" size={18} />
                    </Link>
                  );
                })}
              </div>
              <div className="progress-note">
                <Icon name="shield" />
                <p>
                  Completion means you marked a lesson as read. It is a record of learning, not a
                  measure of trading readiness or a guarantee of results.
                </p>
              </div>
            </>
          )}
          {!lesson && view === 'resources' && (
            <>
              <PageTitle
                eyebrow="CURIOUS MINDS CHECK THEIR SOURCES"
                title="Grounded in good reading."
                description="A library of references from regulators, exchanges, and financial educators."
              />
              <div className="editorial-note">
                <Icon name="book" size={28} />
                <div>
                  <h2>Simple words. Honest context.</h2>
                  <p>
                    These lessons were written by AI for this curriculum, with original examples and
                    practice prompts. Reference links support the concepts and offer deeper reading;
                    they are not endorsements of this site. Chart interpretations are presented as
                    uncertain, and all numerical scenarios are hypothetical.
                  </p>
                  <p>
                    This is general education—not personal investment advice. Rules, products, and
                    investor protections differ by country and venue. Refer to the source and your
                    provider for current requirements.
                  </p>
                </div>
              </div>
              <div className="resource-grid">
                {Object.entries(sources).map(([id, s]) => (
                  <a
                    key={id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="resource-card"
                  >
                    <span className="eyebrow">{s.name}</span>
                    <h2>{s.title}</h2>
                    <span className="text-link">
                      Read the reference <Icon name="diagonal" size={17} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
          {!lesson && view === 'settings' && (
            <>
              <PageTitle
                eyebrow="MAKE YOURSELF AT HOME"
                title="A space that feels like you."
                description="A few thoughtful preferences for a more comfortable read."
              />
              <div className="settings-card">
                <section>
                  <div>
                    <h2>Appearance</h2>
                    <p>Choose a theme, or follow your device.</p>
                  </div>
                  <div className="setting-options" role="group" aria-label="Appearance">
                    {['light', 'dark', 'system'].map((t) => (
                      <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t}>
                        <Icon name={t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'system'} />
                        {t[0].toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div>
                    <h2>Reading size</h2>
                    <p>A little more breathing room for your eyes.</p>
                  </div>
                  <div className="setting-options" role="group" aria-label="Reading font size">
                    {[16, 18, 20].map((size, i) => (
                      <button
                        key={size}
                        aria-pressed={data.fontSize === size}
                        onClick={() => setData((d) => ({ ...d, fontSize: size }))}
                      >
                        {['Standard', 'Comfortable', 'Large'][i]}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <div>
                    <h2>Your learning data</h2>
                    <p>
                      Progress, notes, and history stay in this browser.
                      <br />
                      Export a backup to keep a copy or move devices.
                    </p>
                  </div>
                  <div className="data-buttons">
                    <button
                      className="button secondary"
                      onClick={() =>
                        downloadFile(
                          JSON.stringify(data, null, 2),
                          `lett-backup-${dayKey(new Date())}.json`,
                        )
                      }
                    >
                      <Icon name="download" size={17} /> Export backup
                    </button>
                    <button className="text-link" onClick={() => importedFile.current?.click()}>
                      Restore backup <Icon name="arrow" size={16} />
                    </button>
                    <input
                      ref={importedFile}
                      type="file"
                      accept="application/json,.json"
                      hidden
                      aria-label="Import learning backup"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const parsed: unknown = JSON.parse(await file.text());
                          if (!isLearningData(parsed)) throw Error('invalid');
                          const knownIds = new Set(lessons.map((l) => l.id));
                          if (
                            parsed.completed.some((id) => !knownIds.has(id)) ||
                            parsed.notes.some((n) => n.lessonId && !knownIds.has(n.lessonId)) ||
                            parsed.history.some((h) => h.lessonId && !knownIds.has(h.lessonId))
                          )
                            throw Error('unknown lessons');
                          setData((d) => ({
                            ...parsed,
                            completed: Array.from(new Set([...d.completed, ...parsed.completed])),
                            notes: Array.from(
                              new Map([...parsed.notes, ...d.notes].map((n) => [n.id, n])).values(),
                            ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
                            history: Array.from(
                              new Map(
                                [...parsed.history, ...d.history].map((h) => [h.id, h]),
                              ).values(),
                            ).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
                            quiz: { ...parsed.quiz, ...d.quiz },
                          }));
                          saveAllowed.current = true;
                          setToast('Backup restored. Your existing notes and progress were kept.');
                        } catch {
                          setToast(
                            'Could not restore this file. Choose a valid lett. JSON backup.',
                          );
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                </section>
                <section>
                  <div>
                    <h2>Made for focused reading</h2>
                    <p>
                      Keyboard navigation, visible focus, reduced-motion support,
                      <br />
                      and no accounts, trackers, or live trading distractions.
                    </p>
                  </div>
                  <Icon name="shield" size={30} />
                </section>
              </div>
            </>
          )}
          <footer className="footer">
            <span className="footer-brand">lett.</span>
            <span>A little knowledge. A better perspective.</span>
            <span>Made for learning, not financial advice.</span>
          </footer>
        </main>
      </div>
      {selection && lesson && (
        <button
          className="selection-tooltip"
          style={{ left: selection.x, top: selection.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => openDraft(selection.text, lesson.id)}
        >
          <Icon name="plus" size={16} /> Save to notebook
        </button>
      )}
      <dialog
        ref={searchDialog}
        className="search-dialog"
        aria-labelledby="search-title"
        onCancel={() => setSearchOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setSearchOpen(false);
          }
        }}
      >
        <div className="search-dialog-heading">
          <h2 id="search-title">Find your next lesson</h2>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="search-dialog-input">
          <Icon name="search" size={20} />
          <input
            ref={searchRef}
            aria-label="Search lessons"
            aria-controls="search-results"
            aria-describedby="search-help"
            autoComplete="off"
            placeholder="Search lessons, topics, or ideas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) {
                router.push(lessonHref(searchResults[0].id));
                setSearchOpen(false);
              }
            }}
          />
        </div>
        <div id="search-results" className="search-results">
          {query.trim() ? (
            <>
              <p className="search-results-label" role="status">
                {searchResults.length
                  ? 'LESSONS'
                  : 'No lessons found. Try “risk”, “candles”, or “market”.'}
              </p>
              {searchResults.map((item) => (
                <Link key={item.id} href={lessonHref(item.id)} onClick={() => setSearchOpen(false)}>
                  <Icon name="book" size={18} />
                  <span>
                    {item.title}
                    <small>
                      Phase {item.phase} · {phases[item.phase].title}
                    </small>
                  </span>
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
            </>
          ) : (
            <p>Find a little clarity. Try “risk”, “candles”, or “market”.</p>
          )}
        </div>
        <p id="search-help" className="search-dialog-help">
          Enter to open the first match · Tab to browse · Esc to close
        </p>
      </dialog>
      <dialog
        ref={dialog}
        className="note-dialog"
        onCancel={(e) => {
          e.preventDefault();
          closeDraft();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) closeDraft();
        }}
        aria-labelledby="note-dialog-title"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveNote();
          }}
        >
          <div className="dialog-heading">
            <span className="eyebrow">YOUR PERSONAL NOTEBOOK</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Close note editor"
              onClick={closeDraft}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="note-dialog-title">{draft?.id ? 'A second thought.' : 'Keep this thought.'}</h2>
          {draft?.lessonId && (
            <p className="dialog-source">
              From {lessons.find((l) => l.id === draft.lessonId)?.title}
            </p>
          )}
          {draft?.quote && <blockquote>{draft.quote}</blockquote>}
          <label htmlFor="note-content">
            {draft?.quote ? 'Add your thoughts (optional)' : 'Your note'}
          </label>
          <textarea
            id="note-content"
            autoFocus
            required={!draft?.quote}
            value={draft?.text || ''}
            placeholder="Why did this stand out to you?"
            onChange={(e) => setDraft((d) => (d ? { ...d, text: e.target.value } : d))}
          />
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={closeDraft}>
              Cancel
            </button>
            <button
              className="button orange"
              disabled={!draft?.quote.trim() && !draft?.text.trim()}
            >
              <Icon name="check" size={17} /> Save note
            </button>
          </div>
        </form>
      </dialog>
      <AiAssistant lesson={lesson} completed={data.completed} />
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Icon name="check" size={18} />
            {toast}
            {deletedNote && toast === 'Note deleted.' && (
              <button
                className="undo-button"
                onClick={() => {
                  setData((d) => ({
                    ...d,
                    notes: [deletedNote, ...d.notes].sort(
                      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
                    ),
                  }));
                  setDeletedNote(null);
                  setToast('Note restored.');
                }}
              >
                Undo
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading subpage-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
