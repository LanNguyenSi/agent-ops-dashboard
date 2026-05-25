import axios, { AxiosInstance } from 'axios';
import type {
  Agent,
  RegisterPayload,
  HeartbeatPayload,
  CommandPayload,
  CommandResponse,
} from './types';

export interface AgentOpsClientOptions {
  /**
   * Bearer token sent as `Authorization: Bearer <token>` on every gateway call.
   * Required when the gateway has `GATEWAY_TOKEN` set (the default in prod).
   * If you omit it and the gateway requires auth, calls will fail with 401.
   */
  token?: string;
}

export class AgentOpsClient {
  private client: AxiosInstance;

  constructor(gatewayUrl: string, options: AgentOpsClientOptions = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    this.client = axios.create({
      baseURL: gatewayUrl,
      headers,
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
