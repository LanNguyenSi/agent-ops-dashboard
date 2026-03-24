import { AgentList } from "@/components/AgentList";
import { RepoList } from "@/components/RepoList";

export default function Home() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero surface-card">
        <div className="max-w-3xl">
          <p className="dashboard-kicker">Operations Overview</p>
          <h1 className="dashboard-title">Agent Ops Dashboard</h1>
          <p className="dashboard-subtitle">
            A calmer live view of agent availability and repository health, with a clearer visual
            hierarchy than the default card grid.
          </p>
        </div>

        <div className="hero-badges" aria-label="Dashboard focus areas">
          <span className="hero-badge">Gateway Signals</span>
          <span className="hero-badge">GitHub Health</span>
          <span className="hero-badge">Delivery Posture</span>
        </div>
      </section>

      <section className="dashboard-section surface-card">
        <div className="section-header">
          <div>
            <p className="section-kicker">Agents</p>
            <h2 className="section-title">Runtime Status</h2>
          </div>
          <p className="section-copy">
            Availability, recent activity, and uptime in one compact operational view.
          </p>
        </div>
        <AgentList />
      </section>

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
