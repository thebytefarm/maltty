import { stories } from '@maltty/core/stories'
import { z } from 'zod'

import type { SystemMonitorProps } from './SystemMonitor'
import { SystemMonitor } from './SystemMonitor'

const ServiceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['healthy', 'degraded', 'down']),
  latency: z.string(),
})

const EventEntrySchema = z.object({
  time: z.string(),
  severity: z.enum(['info', 'warn', 'critical']),
  message: z.string(),
})

const schema = z.object({
  hostname: z.string().describe('Server hostname'),
  uptime: z.string().describe('Human-readable uptime'),
  cpuUsage: z.number().describe('CPU usage percentage (0-100)'),
  memoryUsage: z.number().describe('Memory usage percentage (0-100)'),
  diskUsage: z.number().describe('Disk usage percentage (0-100)'),
  networkIn: z.string().describe('Inbound network throughput'),
  networkOut: z.string().describe('Outbound network throughput'),
  activeConnections: z.number().describe('Number of active connections'),
  processes: z.number().describe('Running process count'),
  loadAvg1: z.number().describe('1-minute load average'),
  loadAvg5: z.number().describe('5-minute load average'),
  loadAvg15: z.number().describe('15-minute load average'),
  services: z.array(ServiceStatusSchema).describe('Monitored services'),
  recentEvents: z.array(EventEntrySchema).describe('Recent system events'),
})

export default stories<SystemMonitorProps>({
  title: 'SystemMonitor',
  component: SystemMonitor,
  schema,
  defaults: {
    networkIn: '142.3 MB/s',
    networkOut: '89.7 MB/s',
    activeConnections: 1247,
    processes: 312,
    loadAvg1: 0.87,
    loadAvg5: 0.64,
    loadAvg15: 0.52,
    services: [
      { name: 'api-gateway', status: 'healthy', latency: '12ms' },
      { name: 'postgres-primary', status: 'healthy', latency: '3ms' },
      { name: 'redis-cache', status: 'healthy', latency: '1ms' },
      { name: 'worker-queue', status: 'healthy', latency: '8ms' },
      { name: 'cdn-origin', status: 'healthy', latency: '45ms' },
    ],
    recentEvents: [
      { time: '14:23:01', severity: 'info', message: 'Deployment v2.14.0 completed successfully' },
      { time: '14:18:45', severity: 'info', message: 'SSL certificate renewed for *.example.com' },
      { time: '13:55:12', severity: 'info', message: 'Automated backup completed (2.4 GB)' },
      { time: '12:30:00', severity: 'info', message: 'Scheduled maintenance window closed' },
    ],
  },
  stories: {
    Healthy: {
      description: 'All systems nominal with low resource usage',
      props: {
        hostname: 'prod-web-01.us-east-1',
        uptime: '47d 12h 38m',
        cpuUsage: 23,
        memoryUsage: 41,
        diskUsage: 58,
      },
    },
    Degraded: {
      description: 'System under load with some services degraded',
      props: {
        hostname: 'prod-web-02.us-west-2',
        uptime: '12d 3h 15m',
        cpuUsage: 78,
        memoryUsage: 85,
        diskUsage: 72,
        networkIn: '891.2 MB/s',
        networkOut: '445.6 MB/s',
        activeConnections: 8432,
        processes: 587,
        loadAvg1: 3.21,
        loadAvg5: 2.87,
        loadAvg15: 1.94,
        services: [
          { name: 'api-gateway', status: 'degraded', latency: '340ms' },
          { name: 'postgres-primary', status: 'healthy', latency: '18ms' },
          { name: 'redis-cache', status: 'degraded', latency: '95ms' },
          { name: 'worker-queue', status: 'healthy', latency: '22ms' },
          { name: 'cdn-origin', status: 'healthy', latency: '67ms' },
        ],
        recentEvents: [
          {
            time: '14:25:33',
            severity: 'warn',
            message: 'API response time exceeding SLA threshold',
          },
          { time: '14:22:10', severity: 'warn', message: 'Redis eviction rate elevated (>500/s)' },
          { time: '14:20:01', severity: 'info', message: 'Auto-scaling triggered: +2 instances' },
          {
            time: '14:15:44',
            severity: 'warn',
            message: 'Memory pressure detected on worker pool',
          },
        ],
      },
    },
    Critical: {
      description: 'Critical failure state with services down',
      props: {
        hostname: 'prod-db-01.eu-central-1',
        uptime: '0d 2h 47m',
        cpuUsage: 97,
        memoryUsage: 94,
        diskUsage: 91,
        networkIn: '12.1 MB/s',
        networkOut: '3.4 MB/s',
        activeConnections: 43,
        processes: 891,
        loadAvg1: 8.72,
        loadAvg5: 6.45,
        loadAvg15: 4.12,
        services: [
          { name: 'api-gateway', status: 'down', latency: 'timeout' },
          { name: 'postgres-primary', status: 'down', latency: 'timeout' },
          { name: 'redis-cache', status: 'down', latency: 'timeout' },
          { name: 'worker-queue', status: 'degraded', latency: '4200ms' },
          { name: 'cdn-origin', status: 'healthy', latency: '52ms' },
        ],
        recentEvents: [
          {
            time: '14:28:02',
            severity: 'critical',
            message: 'Primary database connection pool exhausted',
          },
          {
            time: '14:27:15',
            severity: 'critical',
            message: 'OOM killer invoked — redis-server terminated',
          },
          {
            time: '14:26:50',
            severity: 'critical',
            message: 'Disk usage exceeded 90% on /var/data',
          },
          {
            time: '14:25:01',
            severity: 'warn',
            message: 'Failover initiated to secondary replica',
          },
          {
            time: '14:24:30',
            severity: 'critical',
            message: 'Connection refused: postgres port 5432',
          },
        ],
      },
    },
  },
})
