import axios, { AxiosInstance } from 'axios';
import type {
  Agent,
  RegisterPayload,
  HeartbeatPayload,
  CommandPayload,
  CommandResponse,
} from './types';

export class AgentOpsClient {
  private client: AxiosInstance;

  constructor(gatewayUrl: string) {
    this.client = axios.create({
      baseURL: gatewayUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async register(payload: RegisterPayload): Promise<Agent> {
    const { data } = await this.client.post<Agent>('/agents/register', payload);
    return data;
  }

  async heartbeat(agentId: string, payload: HeartbeatPayload = {}): Promise<Agent> {
    const { data } = await this.client.post<Agent>(`/agents/${agentId}/heartbeat`, payload);
    return data;
  }

  async getAgents(): Promise<Agent[]> {
    const { data } = await this.client.get<Agent[]>('/agents');
    return data;
  }

  async sendCommand(agentId: string, payload: CommandPayload): Promise<CommandResponse> {
    const { data } = await this.client.post<CommandResponse>(`/agents/${agentId}/command`, payload);
    return data;
  }
}
