import { AgentBar } from "@/components/AgentBar";
import { RepoList } from "@/components/RepoList";

export default function Home() {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar surface-card">
        <h1 className="topbar-title">Agent Ops</h1>
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
