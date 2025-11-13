import { DateTime, Duration } from "luxon";
import { parseExpression } from "../utils/expressionParser";
import { emojiFromKeyword } from "../utils/emojiFromKeyword";
import { Rule, Dates } from "../schedule";
import type { ParsedExpression } from "../utils/expressionParser";
import type { ICalRuleFrequency } from "@rschedule/core/rules/ICAL_RULES";
import { now } from "../utils/now";

export class Task {
  id: string;
  expression: string;
  parsed: ParsedExpression;
  createdAt: Date;
  lastModified: Date;
  completedAt?: Date;
  isCompleted: boolean;
  completionCount: number;
  lastCompletedAt: Date;

  constructor(expression: string) {
    this.id = Math.random().toString(36).substring(2, 11);
    this.expression = expression;
    this.parsed = parseExpression(expression);
    this.createdAt = new Date();
    this.lastModified = new Date();
    this.lastCompletedAt = new Date();
    this.isCompleted = false;
    this.completionCount = 0;
  }

  get subject(): string {
    return this.parsed.subject;
  }

  get subjectWithoutUrls(): string {
    const subject = this.parsed.subject;
    const urls = this.parsed.urls;

    let cleanSubject = subject;
    urls.forEach((url) => {
      cleanSubject = cleanSubject.replace(url, "").trim();
    });

    // Clean up multiple spaces
    return cleanSubject.replace(/\s+/g, " ").trim();
  }

  get contexts(): string[] {
    return this.parsed.contexts;
  }

  get tags(): string[] {
    return this.parsed.tags;
  }

  get urls(): string[] {
    return this.parsed.urls;
  }

  get isValid(): boolean {
    return !!(this.parsed && this.subject);
  }

  get endAt(): DateTime | null {
    if (this.nextAt && this.duration) {
      return this.nextAt.plus(Duration.fromMillis(this.duration));
    }

    return null;
  }

  get simplifiedExpression(): string {
    // For now, return the original expression
    // In the webapp, this would use a toExpression helper
    return this.expression.trim();
  }

  get start(): Date | undefined {
    return this.parsed.start;
  }

  get duration(): number | undefined {
    return this.parsed.duration?.milliseconds;
  }

  get isRecurring(): boolean {
    return !!this.parsed.frequency;
  }

  get emojis(): string[] {
    return [...this.contexts, ...this.tags]
      .map((x) => emojiFromKeyword(x))
      .filter((x) => x !== undefined) as string[];
  }

  get completionStats() {
    if (!this.isRecurring) return null;

    // For recurring tasks, calculate total time spent across all completions
    let totalTimeSpent = null;
    if (this.createdAt && this.lastCompletedAt && this.completionCount > 0) {
      totalTimeSpent =
        this.lastCompletedAt.getTime() - this.createdAt.getTime();
    }

    return {
      total: this.completionCount,
      totalTimeSpent,
    };
  }

  get implicitStart(): DateTime {
    // If task has a start time and it's in the future relative to last completion, use it
    if (this.start && this.start > this.lastCompletedAt) {
      return DateTime.fromJSDate(this.start);
    }
    // Otherwise use the last completed time
    return DateTime.fromJSDate(this.lastCompletedAt);
  }

  get parsedUrls() {
    return this.urls.map((url) => {
      try {
        const parsed = new URL(url);
        const parts = parsed.hostname.split(".");
        const domain =
          parts.length >= 2 ? parts.slice(-2).join(".") : parsed.hostname;
        return { url, domain };
      } catch {
        return { url, domain: null };
      }
    });
  }

  get frequency(): ICalRuleFrequency | undefined {
    return this.parsed.frequency as ICalRuleFrequency;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get asRuleOptions(): any {
    if (!this.parsed) return null;
    if (!this.frequency) return null;

    const { duration, start: parsedStart, ...rrule } = this.parsed;
    const start = parsedStart
      ? DateTime.fromJSDate(parsedStart)
      : this.lastCompletedAt
        ? DateTime.fromJSDate(this.lastCompletedAt)
        : now();

    if (Object.keys(rrule).length === 0) return null;

    return {
      ...rrule,
      frequency: this.frequency,
      ...(duration && { duration: duration.milliseconds }),
      start,
    };
  }

  get rrule() {
    return this.asRuleOptions && new Rule(this.asRuleOptions);
  }

  getOccurrences({
    start = now(),
    take,
    end,
  }: {
    start?: DateTime;
    take?: number;
    end?: DateTime;
  }): DateTime[] {
    let target;

    if (!take && !end) {
      throw new Error("either take or end must be specified");
    }

    if (this.isRecurring && this.rrule) {
      target = this.rrule;
    } else if (this.start) {
      // Ensure consistent timezone handling by converting to the same zone as start
      const normalizedStart = DateTime.fromJSDate(this.start).setZone(
        start.zone,
      );
      target = new Dates({
        dates: [normalizedStart],
        timezone: start.zoneName,
      });
    } else {
      return [];
    }

    // Ensure all parameters have consistent timezone
    const normalizedEnd = end?.setZone(start.zone);

    return target
      .occurrences({ start, end: normalizedEnd, take })
      .toArray()
      .map((x: { date: DateTime }) => x.date);
  }

  nextAfter(start: DateTime, skipCurrent: boolean = false): DateTime | null {
    let occ = this.getOccurrences({ start, take: 2 });
    if (skipCurrent) occ = occ.filter((x) => x > start);
    return occ[0];
  }

  update(props: Partial<Omit<Task, "id" | "createdAt">>) {
    Object.assign(this, props);
    this.lastModified = new Date();
  }

  finalizeExpression() {
    if (this.parsed) {
      this.expression = this.expression.trim();
    } else {
      this.expression = this.expression.trim();
    }
  }

  get nextAt(): DateTime | null {
    if (this.isCompleted && !this.isRecurring) return null;

    // Use rschedule for recurring tasks
    if (this.isRecurring) {
      return this.nextAfter(this.implicitStart);
    }

    // For one-time tasks
    if (this.start) {
      const startDT = DateTime.fromJSDate(this.start);
      if (startDT > now()) {
        return startDT;
      }
    }

    return null;
  }

  complete(): Task {
    const currentTime = now();

    if (this.isCompleted) {
      // Uncomplete the task - decrement count if > 0
      this.isCompleted = false;
      if (this.completionCount > 0) {
        this.completionCount--;
      }
      this.lastModified = currentTime.toJSDate();
      return this;
    }

    // Add completion
    this.completionCount++;

    if (this.isRecurring) {
      let nextAt = this.nextAt;
      if (nextAt) {
        if (currentTime < nextAt) {
          nextAt = this.nextAfter(nextAt, true); // Get next occurrence after current completion
          if (nextAt) {
            this.lastCompletedAt = nextAt.toJSDate();
          }
        } else {
          this.lastCompletedAt = currentTime.toJSDate();
        }
        this.lastModified = currentTime.toJSDate();
        return this;
      }
    }

    // For non-recurring tasks, mark as completed
    this.lastCompletedAt = currentTime.toJSDate();
    this.isCompleted = true;
    this.completedAt = currentTime.toJSDate();
    this.lastModified = currentTime.toJSDate();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      expression: this.expression,
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      isCompleted: this.isCompleted,
      completionCount: this.completionCount,
      lastCompletedAt: this.lastCompletedAt.toISOString(),
    };
  }

  static fromJSON(data: {
    id: string;
    expression: string;
    createdAt: string;
    lastModified?: string;
    completedAt?: string;
    isCompleted: boolean;
    completionCount?: number;
    lastCompletedAt?: string;
  }): Task {
    const task = new Task(data.expression);
    task.id = data.id;
    task.createdAt = new Date(data.createdAt);
    task.lastModified = data.lastModified
      ? new Date(data.lastModified)
      : new Date(data.createdAt);
    task.completedAt = data.completedAt
      ? new Date(data.completedAt)
      : undefined;
    task.isCompleted = data.isCompleted;
    task.completionCount = data.completionCount || 0;
    task.lastCompletedAt = data.lastCompletedAt
      ? new Date(data.lastCompletedAt)
      : new Date(data.createdAt);
    return task;
  }
}
