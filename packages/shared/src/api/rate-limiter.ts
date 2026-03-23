/** A simple sliding-window rate limiter for API calls */
export class RateLimiter {
  private timestamps: number[] = [];
  private queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];
  private processing = false;

  constructor(
    /** Max requests allowed in the window */
    private maxRequests: number,
    /** Window size in milliseconds */
    private windowMs: number
  ) {}

  /** Clean up timestamps outside the current window */
  private cleanup(): void {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
  }

  /** Process queued requests */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.cleanup();

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(Date.now());
        const next = this.queue.shift();
        next?.resolve();
      } else {
        // Wait until the oldest request falls out of the window
        const oldestTs = this.timestamps[0];
        const waitMs = this.windowMs - (Date.now() - oldestTs) + 10;
        await new Promise<void>((r) => setTimeout(r, waitMs));
      }
    }

    this.processing = false;
  }

  /** Acquire a slot — resolves when it's safe to make the request */
  async acquire(): Promise<void> {
    this.cleanup();

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }

  /** Update limits from API response headers (GGG Trade API) */
  updateFromHeaders(headers: Headers): void {
    const limitHeader = headers.get("X-Rate-Limit-Ip");
    if (limitHeader) {
      // Format: "requests:period:timeout" e.g. "12:10:60"
      const parts = limitHeader.split(":");
      if (parts.length >= 2) {
        this.maxRequests = parseInt(parts[0], 10);
        this.windowMs = parseInt(parts[1], 10) * 1000;
      }
    }
  }

  /** Current usage info */
  get status() {
    this.cleanup();
    return {
      used: this.timestamps.length,
      max: this.maxRequests,
      windowMs: this.windowMs,
      queued: this.queue.length,
    };
  }
}
