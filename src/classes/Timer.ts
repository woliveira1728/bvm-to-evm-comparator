interface TimerOptions {
  onUpdate?: (time: number, formattedTime: string) => void;
  onComplete?: (totalTime: number, formattedTime: string) => void;
  precision?: number;
}

class Timer {
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly onUpdate?: (time: number, formattedTime: string) => void;
  private readonly onComplete?: (totalTime: number, formattedTime: string) => void;
  private readonly precision: number;

  constructor(options: TimerOptions = {}) {
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
    this.precision = options.precision || 10;
  }

  start(): void {
    if (!this.isRunning) {
      this.startTime = Date.now() - this.elapsedTime;
      this.timerInterval = setInterval(() => this.update(), this.precision);
      this.isRunning = true;
    }
  }

  private update(): void {
    const now = Date.now();
    this.elapsedTime = now - this.startTime;
    
    if (this.onUpdate) {
      this.onUpdate(this.elapsedTime, this.formatTime(this.elapsedTime));
    }
  }

  stop(options: { reset?: boolean } = {}): void {
    if (this.isRunning && this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.isRunning = false;
      this.elapsedTime = Date.now() - this.startTime;
      
      if (options.reset) {
        this.elapsedTime = 0;
      }
      
      if (this.onComplete) {
        this.onComplete(this.elapsedTime, this.formatTime(this.elapsedTime));
      }
    }
  }

  reset(): void {
    this.stop();
    this.elapsedTime = 0;
  }

  getTime(): number {
    if (this.isRunning) {
      return Date.now() - this.startTime;
    }
    return this.elapsedTime;
  }

  formatTime(time: number = this.getTime()): string {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const milliseconds = time % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export default Timer;