import { AgentBar } from "@/components/AgentBar";
import { RepoList } from "@/components/RepoList";

export default function Home() {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar surface-card">
        <div className="flex items-center gap-6">
          <h1 className="topbar-title">Agent Ops</h1>
          <nav className="flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-900">Dashboard</span>
            <a href="/activity" className="text-gray-500 hover:text-gray-900 transition-colors">
              Activity
            </a>
          </nav>
        </div>
        <AgentBar />
      </header>

      <section className="dashboard-section surface-card">
        <div className="section-header">
          <div>
            <p className="section-kicker">Repositories</p>
            <h2 className="section-title">Delivery Health</h2>
          </div>
          <p className="section-copy">
            CI posture, PR pressure, and recent delivery activity for connected repositories.
          </p>
        </div>
        <RepoList />
      </section>
    </main>
  );
}
