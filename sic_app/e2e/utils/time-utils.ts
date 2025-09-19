/**
 * Time manipulation utilities for E2E tests
 */

import { Page } from '@playwright/test'

export interface TimeAdvanceOptions {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
}

export class TimeController {
  private page: Page
  private originalDate: Date

  constructor(page: Page) {
    this.page = page
    this.originalDate = new Date()
  }

  /**
   * Mock the system clock to a specific date/time
   */
  async setSystemTime(date: Date) {
    await this.page.addInitScript((time) => {
      // Mock Date constructor
      const OriginalDate = Date
      const mockTime = time

      // @ts-ignore
      Date = class extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockTime)
          } else {
            super(...args)
          }
        }

        static now() {
          return mockTime
        }
      }

      // Copy static methods
      Object.setPrototypeOf(Date, OriginalDate)
      Object.defineProperty(Date, 'prototype', {
        value: OriginalDate.prototype,
        writable: false
      })
    }, date.getTime())
  }

  /**
   * Advance time by specified duration
   */
  async advanceTime(options: TimeAdvanceOptions) {
    const currentTime = await this.getCurrentTime()
    const advance = this.calculateAdvanceMs(options)
    const newTime = new Date(currentTime.getTime() + advance)

    await this.setSystemTime(newTime)
    return newTime
  }

  /**
   * Get current mocked time
   */
  async getCurrentTime(): Promise<Date> {
    return await this.page.evaluate(() => new Date())
  }

  /**
   * Reset time to original system time
   */
  async resetTime() {
    await this.page.addInitScript(() => {
      // Remove the Date mock
      delete (window as any).Date
    })
  }

  private calculateAdvanceMs(options: TimeAdvanceOptions): number {
    const { days = 0, hours = 0, minutes = 0, seconds = 0 } = options
    return (
      days * 24 * 60 * 60 * 1000 +
      hours * 60 * 60 * 1000 +
      minutes * 60 * 1000 +
      seconds * 1000
    )
  }
}

export class SchedulerSimulator {
  private page: Page
  private timeController: TimeController

  constructor(page: Page) {
    this.page = page
    this.timeController = new TimeController(page)
  }

  /**
   * Simulate scheduler running at specific time
   */
  async triggerScheduler(targetTime?: Date) {
    if (targetTime) {
      await this.timeController.setSystemTime(targetTime)
    }

    // Trigger scheduler endpoint
    await this.page.route('**/scheduler/run', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processed: 1,
          sent: 1,
          failed: 0,
          timestamp: await this.timeController.getCurrentTime()
        })
      })
    })

    // Make API call to trigger scheduler
    return await this.page.evaluate(async () => {
      const response = await fetch('/api/scheduler/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      return response.json()
    })
  }

  /**
   * Advance time to next scheduled reminder
   */
  async advanceToNextReminder() {
    // Get next scheduled reminder time
    const reminders = await this.page.evaluate(async () => {
      const response = await fetch('/api/reminders?status=scheduled', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      return response.json()
    })

    if (reminders && reminders.length > 0) {
      const nextReminder = reminders[0]
      const scheduledTime = new Date(nextReminder.scheduled_date)

      await this.timeController.setSystemTime(scheduledTime)
      return await this.triggerScheduler(scheduledTime)
    }

    throw new Error('No scheduled reminders found')
  }

  /**
   * Simulate passage of time with multiple scheduler runs
   */
  async simulateTimePassage(
    duration: TimeAdvanceOptions,
    schedulerIntervalHours = 1
  ) {
    const totalMs = this.timeController['calculateAdvanceMs'](duration)
    const intervalMs = schedulerIntervalHours * 60 * 60 * 1000
    const steps = Math.ceil(totalMs / intervalMs)

    const results = []

    for (let i = 0; i < steps; i++) {
      await this.timeController.advanceTime({ hours: schedulerIntervalHours })
      const result = await this.triggerScheduler()
      results.push(result)
    }

    return results
  }
}

export const timeUtils = {
  /**
   * Format date for API requests
   */
  formatApiDate(date: Date): string {
    return date.toISOString().split('T')[0]
  },

  /**
   * Format datetime for API requests
   */
  formatApiDateTime(date: Date): string {
    return date.toISOString()
  },

  /**
   * Create date relative to now
   */
  createRelativeDate(options: TimeAdvanceOptions): Date {
    const now = new Date()
    const advance = (
      (options.days || 0) * 24 * 60 * 60 * 1000 +
      (options.hours || 0) * 60 * 60 * 1000 +
      (options.minutes || 0) * 60 * 1000 +
      (options.seconds || 0) * 1000
    )
    return new Date(now.getTime() + advance)
  },

  /**
   * Check if date is in the past
   */
  isOverdue(dueDateStr: string): boolean {
    const dueDate = new Date(dueDateStr)
    return dueDate < new Date()
  }
}