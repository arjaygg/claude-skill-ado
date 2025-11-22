/**
 * Performance monitoring utilities
 * Track execution time and provide performance metrics
 */

export class PerformanceTimer {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a checkpoint with a label
   */
  checkpoint(label: string): void {
    this.checkpoints.set(label, Date.now());
  }

  /**
   * Get elapsed time since start
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get time between two checkpoints
   */
  getDuration(startLabel: string, endLabel: string): number | null {
    const start = this.checkpoints.get(startLabel);
    const end = this.checkpoints.get(endLabel);
    
    if (!start || !end) {
      return null;
    }
    
    return end - start;
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Print all checkpoints with durations
   */
  printReport(): void {
    console.log('\n📊 Performance Report:');
    console.log('─'.repeat(60));
    
    const checkpointArray = Array.from(this.checkpoints.entries());
    
    for (let i = 0; i < checkpointArray.length; i++) {
      const [label, time] = checkpointArray[i];
      const duration = time - (i > 0 ? checkpointArray[i - 1][1] : this.startTime);
      const totalElapsed = time - this.startTime;
      
      console.log(
        `  ${label.padEnd(40)} ${PerformanceTimer.formatDuration(duration).padStart(10)} (total: ${PerformanceTimer.formatDuration(totalElapsed)})`
      );
    }
    
    console.log('─'.repeat(60));
    console.log(`  Total elapsed time: ${PerformanceTimer.formatDuration(this.getElapsed())}`);
    console.log();
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private snapshots: Map<string, NodeJS.MemoryUsage> = new Map();

  /**
   * Take a memory snapshot
   */
  snapshot(label: string): void {
    this.snapshots.set(label, process.memoryUsage());
  }

  /**
   * Get memory usage difference between two snapshots
   */
  getDiff(startLabel: string, endLabel: string): Partial<NodeJS.MemoryUsage> | null {
    const start = this.snapshots.get(startLabel);
    const end = this.snapshots.get(endLabel);
    
    if (!start || !end) {
      return null;
    }
    
    return {
      heapUsed: end.heapUsed - start.heapUsed,
      heapTotal: end.heapTotal - start.heapTotal,
      external: end.external - start.external,
      rss: end.rss - start.rss
    };
  }

  /**
   * Format bytes in human-readable format
   */
  static formatBytes(bytes: number): string {
    const abs = Math.abs(bytes);
    
    if (abs < 1024) {
      return `${bytes}B`;
    } else if (abs < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }
  }

  /**
   * Print current memory usage
   */
  printCurrent(): void {
    const mem = process.memoryUsage();
    console.log('\n💾 Memory Usage:');
    console.log(`  Heap Used: ${MemoryTracker.formatBytes(mem.heapUsed)}`);
    console.log(`  Heap Total: ${MemoryTracker.formatBytes(mem.heapTotal)}`);
    console.log(`  RSS: ${MemoryTracker.formatBytes(mem.rss)}`);
    console.log();
  }
}

/**
 * Simple profiler for function execution
 */
export async function profile<T>(
  label: string,
  fn: () => T | Promise<T>,
  verbose: boolean = true
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    if (verbose) {
      console.log(`⏱️  ${label}: ${PerformanceTimer.formatDuration(duration)}`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    if (verbose) {
      console.log(`⏱️  ${label}: ${PerformanceTimer.formatDuration(duration)} (failed)`);
    }
    
    throw error;
  }
}
