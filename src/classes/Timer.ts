interface TimerOptions {
  onUpdate?: (time: number, formattedTime: string) => void;
  precision?: number;
}

class Timer {
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private readonly onUpdate?: (time: number, formattedTime: string) => void;
  private readonly precision: number;

  constructor(options: TimerOptions = {}) {
    this.onUpdate = options.onUpdate;
    this.precision = options.precision || 10; // padrão 10ms
  }

  start(): void {
    if (!this.isRunning) {
      this.startTime = Date.now() - this.elapsedTime;
      this.lastUpdateTime = this.startTime;
      this.timerInterval = setInterval(() => this.update(), this.precision);
      this.isRunning = true;
    }
  }

  private update(): void {
    const now = Date.now();
    this.elapsedTime = now - this.startTime;
    this.lastUpdateTime = now;
    
    if (this.onUpdate) {
      this.onUpdate(this.elapsedTime, this.formatTime(this.elapsedTime));
    }
  }

  stop(): void {
    if (this.isRunning && this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.isRunning = false;
      // Atualiza o tempo final para garantir precisão
      this.elapsedTime = Date.now() - this.startTime;
    }
  }

  reset(): void {
    this.stop();
    this.elapsedTime = 0;
    if (this.onUpdate) {
      this.onUpdate(this.elapsedTime, this.formatTime(this.elapsedTime));
    }
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