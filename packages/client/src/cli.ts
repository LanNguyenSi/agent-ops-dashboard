#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AgentOpsClient } from './api-client';
import { loadConfig, saveConfig, getConfigPath } from './config';

const program = new Command();

program
  .name('agent-ops')
  .description('CLI for agent-ops monitoring')
  .version('0.1.0');

program
  .command('register')
  .description('Register this agent with the gateway')
  .requiredOption('--name <name>', 'Agent name')
  .option('--tags <tags...>', 'Agent tags (space-separated)')
  .option('--meta <json>', 'Additional metadata (JSON string)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new AgentOpsClient(config.gatewayUrl);

      const payload: any = {
        name: options.name,
        tags: options.tags || [],
      };

      if (options.meta) {
        try {
          payload.meta = JSON.parse(options.meta);
        } catch {
          console.error(chalk.red('❌ Invalid JSON in --meta'));
          process.exit(1);
        }
      }

      const agent = await client.register(payload);

      // Save agent ID to config
      saveConfig({ agentId: agent.id, agentName: agent.name });

      console.log(chalk.green(`✅ Registered: ${agent.name} (${agent.id})`));
      console.log(chalk.gray(`   Config: ${getConfigPath()}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Registration failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('heartbeat')
  .description('Send heartbeat to gateway')
  .argument('[agentId]', 'Agent ID (defaults to saved config)')
  .option('--task <task>', 'Current task description')
  .option('--status <status>', 'Agent status (online|offline|idle|busy)')
  .option('--interval <seconds>', 'Run heartbeat loop every N seconds')
  .action(async (agentId, options) => {
    try {
      const config = loadConfig();
      const client = new AgentOpsClient(config.gatewayUrl);

      const id = agentId || config.agentId;
      if (!id) {
        console.error(chalk.red('❌ No agent ID. Run "agent-ops register" first or provide ID'));
        process.exit(1);
      }

      const payload: any = {};
      if (options.task) payload.currentTask = options.task;
      if (options.status) payload.status = options.status;

      if (options.interval) {
        const intervalMs = parseInt(options.interval) * 1000;
        console.log(chalk.blue(`🔄 Heartbeat loop: every ${options.interval}s`));
        console.log(chalk.gray(`   Agent: ${id}`));
        console.log(chalk.gray(`   Press Ctrl+C to stop`));

        const sendHeartbeat = async () => {
          try {
            const agent = await client.heartbeat(id, payload);
            console.log(chalk.green(`💓 ${new Date().toISOString()} - ${agent.status}`));
          } catch (error: any) {
            console.error(chalk.red(`❌ ${new Date().toISOString()} - ${error.message}`));
          }
        };

        // Initial heartbeat
        await sendHeartbeat();

        // Loop
        setInterval(sendHeartbeat, intervalMs);
      } else {
        const agent = await client.heartbeat(id, payload);
        console.log(chalk.green(`💓 Heartbeat sent: ${agent.status}`));
        if (agent.currentTask) {
          console.log(chalk.gray(`   Task: ${agent.currentTask}`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Heartbeat failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show all agents from gateway')
  .action(async () => {
    try {
      const config = loadConfig();
      const client = new AgentOpsClient(config.gatewayUrl);

      const agents = await client.getAgents();

      if (agents.length === 0) {
        console.log(chalk.yellow('⚠️  No agents registered'));
        return;
      }

      console.log(chalk.blue(`📊 Agents (${agents.length}):\n`));

      for (const agent of agents) {
        const statusColor =
          agent.status === 'online'
            ? chalk.green
            : agent.status === 'offline'
              ? chalk.red
              : agent.status === 'busy'
                ? chalk.yellow
                : chalk.gray;

        console.log(`${statusColor('●')} ${chalk.bold(agent.name)} (${agent.id})`);
        console.log(`  Status: ${statusColor(agent.status)}`);
        console.log(`  Tags: ${agent.tags.join(', ') || 'none'}`);
        if (agent.currentTask) {
          console.log(`  Task: ${agent.currentTask}`);
        }
        console.log(`  Last seen: ${new Date(agent.lastSeen).toLocaleString()}`);
        console.log();
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to fetch status: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log(chalk.blue('📋 Current configuration:\n'));
    console.log(chalk.gray(`   Gateway URL: ${config.gatewayUrl}`));
    console.log(chalk.gray(`   Agent ID: ${config.agentId || 'not set'}`));
    console.log(chalk.gray(`   Agent Name: ${config.agentName || 'not set'}`));
    console.log(chalk.gray(`   Config file: ${getConfigPath()}`));
  });

program.parse();
