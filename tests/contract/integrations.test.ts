import { describe, it, expect } from 'vitest';

/**
 * Contract Tests
 * 
 * These tests verify that our integration boundaries (API contracts)
 * are properly defined and don't break silently.
 */

describe('Contract: API Response Structures', () => {
  it('should maintain stable agents API contract', async () => {
    const response = await fetch('http://localhost:3000/api/agents');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Contract: agents endpoint returns { agents: Agent[] }
    expect(data).toHaveProperty('agents');
    expect(Array.isArray(data.agents)).toBe(true);
    
    if (data.agents.length > 0) {
      const agent = data.agents[0];
      
      // Contract: Agent has required fields
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('lastMessage');
      
      // Contract: Agent types are correct
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(['online', 'offline']).toContain(agent.status);
    }
  });

  it('should maintain stable pipeline API contract', async () => {
    const response = await fetch('http://localhost:3000/api/pipeline/runs');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Contract: pipeline/runs returns { runs: PipelineRun[] }
    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);
    
    if (data.runs.length > 0) {
      const run = data.runs[0];
      
      // Contract: PipelineRun has required fields
      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('status');
      expect(run).toHaveProperty('repository');
      expect(run).toHaveProperty('branch');
      expect(run).toHaveProperty('commit');
      
      // Contract: PipelineRun types are correct
      expect(typeof run.id).toBe('number');
      expect(typeof run.repository).toBe('string');
      expect(['success', 'failure', 'in_progress', 'cancelled', 'skipped']).toContain(run.status);
    }
  });

  it('should maintain stable alerts API contract', async () => {
    const response = await fetch('http://localhost:3000/api/alerts');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Contract: alerts returns { alerts: Alert[] }
    expect(data).toHaveProperty('alerts');
    expect(Array.isArray(data.alerts)).toBe(true);
    
    if (data.alerts.length > 0) {
      const alert = data.alerts[0];
      
      // Contract: Alert has required fields
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('status');
      expect(alert).toHaveProperty('title');
      expect(alert).toHaveProperty('message');
      
      // Contract: Alert types are correct
      expect(typeof alert.id).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(alert.severity);
      expect(['active', 'acknowledged', 'resolved']).toContain(alert.status);
    }
  });
});

describe('Contract: GitHub Integration', () => {
  it('should handle GitHub API response structure', async () => {
    // This test verifies we correctly map GitHub's response to our types
    const response = await fetch('http://localhost:3000/api/pipeline/runs?limit=1');
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.runs.length > 0) {
        const run = data.runs[0];
        
        // Verify we correctly map GitHub fields
        expect(run).toHaveProperty('htmlUrl'); // mapped from html_url
        expect(run).toHaveProperty('startedAt'); // mapped from created_at
        expect(run).toHaveProperty('completedAt'); // mapped from updated_at
        
        // Verify URL format (GitHub URLs)
        if (run.htmlUrl) {
          expect(run.htmlUrl).toMatch(/^https:\/\/github\.com\//);
        }
      }
    }
  });
});
