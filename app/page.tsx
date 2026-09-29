import LearningApp from '@/components/learning-app';
export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <LearningApp initialView={view} />;
}
