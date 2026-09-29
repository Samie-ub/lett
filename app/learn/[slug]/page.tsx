import { lessons } from '@/lib/curriculum';
import LearningApp from '@/components/learning-app';
import { notFound } from 'next/navigation';
export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.id === slug);
  return { title: `${lesson?.title || 'Lesson'} — lett.` };
}
export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!lessons.some((l) => l.id === slug)) notFound();
  return <LearningApp initialLesson={slug} />;
}
