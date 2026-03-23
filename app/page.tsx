import { AgentList } from "@/components/AgentList";
import { RepoList } from "@/components/RepoList";

export default function Home() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "2rem" }}>Agent Ops Dashboard</h1>
      <AgentList />
      <div style={{ marginTop: "2rem" }}>
        <RepoList />
      </div>
    </main>
  );
}
