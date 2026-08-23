import { LogEntry } from '../data/portfolio-data';

const BOOT_SCRIPT = [
  {
    source: 'SpringApplication',
    level: 'INFO',
    message: 'Starting PORTFOLIO-SERVICE v1.0.0 using Java 21',
  },
  {
    source: 'TomcatWebServer',
    level: 'INFO',
    message: 'Tomcat initialized with port(s): 443 (https)',
  },
  {
    source: 'RedisCacheManager',
    level: 'INFO',
    message: "Connected to redis-cluster: 3 primaries UP, static/dynamic paths decoupled",
  },
  {
    source: 'HikariDataSource',
    level: 'INFO',
    message: "Connection pool 'core-bank-db' started (10 idle, mTLS verified)",
  },
  {
    source: 'KafkaConsumer',
    level: 'INFO',
    message: "Consumer group 'portfolio-ui' subscribed — assignment complete",
  },
  {
    source: 'SpringApplication',
    level: 'INFO',
    message: 'Started PORTFOLIO-SERVICE in 2.341 seconds (JVM running for 2.876)',
  },
] as const satisfies ReadonlyArray<Omit<LogEntry, 'timestamp'>>;

const BOOT_LOG_SPACING_MS = 140;

export function bootLogEntries(): LogEntry[] {
  const now = Date.now();
  const firstTimestampMs = now - (BOOT_SCRIPT.length - 1) * BOOT_LOG_SPACING_MS;
  return BOOT_SCRIPT.map((entry, index) => ({
    ...entry,
    timestamp: new Date(firstTimestampMs + index * BOOT_LOG_SPACING_MS).toISOString(),
  }));
}
