import { ActivityFeed } from "@/components/activity/ActivityFeed";

export const metadata = {
  title: "Activity Feed — Agent Ops",
};

export default function ActivityPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Dashboard
        </a>
      </div>
      <ActivityFeed />
    </main>
  );
}
