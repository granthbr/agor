/**
 * `agor repo list` - List all registered repositories
 *
 * Displays repositories in a beautiful table.
 */

import { createClient, isDaemonRunning } from '@agor/core/api';
import { getDaemonUrl } from '@agor/core/config';
import { formatShortId } from '@agor/core/db';
import type { Repo } from '@agor/core/types';
import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import Table from 'cli-table3';

// Type for paginated responses
interface Paginated<T> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

export default class RepoList extends Command {
  static description = 'List all registered repositories';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    limit: Flags.integer({
      char: 'l',
      description: 'Maximum number of repos to show',
      default: 50,
    }),
  };

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(RepoList);

    // Check if daemon is running
    const daemonUrl = await getDaemonUrl();
    const running = await isDaemonRunning(daemonUrl);

    if (!running) {
      this.error(
        `Daemon not running. Start it with: ${chalk.cyan('cd apps/agor-daemon && pnpm dev')}`
      );
    }

    try {
      // Connect to daemon
      const client = createClient(daemonUrl);

      // Build query
      const query = {
        $limit: flags.limit,
        $sort: { created_at: -1 }, // Most recent first
      };

      // Fetch repos
      const reposService = client.service('repos');
      const result = await reposService.find({ query });
      const isPaginated = !Array.isArray(result);
      const repos = Array.isArray(result) ? result : (result as Paginated<Repo>).data;
      const total = isPaginated ? (result as Paginated<Repo>).total : repos.length;

      if (!Array.isArray(repos) || repos.length === 0) {
        this.log(chalk.dim('No repositories found.'));
        this.log('');
        this.log(`Add one with: ${chalk.cyan('agor repo add <git-url>')}`);
        this.log('');
        client.io.close();
        process.exit(0);
        return;
      }

      // Create table
      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('Slug'),
          chalk.cyan('Remote URL'),
          chalk.cyan('Path'),
          chalk.cyan('Default Branch'),
        ],
        style: {
          head: [],
          border: ['dim'],
        },
        colWidths: [10, 20, 45, 30, 15],
      });

      // Add rows
      for (const repo of repos) {
        const shortId = formatShortId(repo.repo_id);

        table.push([
          chalk.dim(shortId),
          repo.slug,
          this.truncate(repo.remote_url || '(no remote)', 42),
          chalk.dim(this.truncate(repo.local_path, 27)),
          chalk.dim(repo.default_branch || '-'),
        ]);
      }

      // Display
      this.log('');
      this.log(table.toString());
      this.log('');
      if (isPaginated && total > repos.length) {
        this.log(chalk.dim(`Showing ${repos.length} of ${total} repo(s)`));
      } else {
        this.log(chalk.dim(`Showing ${repos.length} repo(s)`));
      }
      this.log('');

      // Close socket connection to allow process to exit
      client.io.close();
      process.exit(0);
    } catch (error) {
      this.error(
        `Failed to fetch repos: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
