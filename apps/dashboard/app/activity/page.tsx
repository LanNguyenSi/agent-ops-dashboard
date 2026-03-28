import { ActivityFeed } from "@/components/activity/ActivityFeed";

export const metadata = {
  title: "Activity Feed — Agent Ops",
};

export default function ActivityPage() {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar surface-card">
        <div className="flex items-center gap-6">
          <h1 className="topbar-title">Agent Ops</h1>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
              Dashboard
            </a>
            <span className="font-medium text-gray-900">Activity</span>
          </nav>
        </div>
      </header>

      <section className="dashboard-section surface-card">
        <ActivityFeed />
      </section>
    </main>
  );
}
