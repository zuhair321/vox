// Monitoring and alerting service for production
// Integrates with various monitoring systems and provides alerting capabilities

import { logger, logMetric, logError } from './logger.js';

class MonitoringService {
  constructor() {
    this.alertThresholds = {
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05, // 5% error rate
      responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 5000, // 5s
      memoryUsage: parseInt(process.env.ALERT_MEMORY_USAGE) || 80, // 80%
      cpuUsage: parseInt(process.env.ALERT_CPU_USAGE) || 80, // 80%
    };

    this.metrics = {
      errorCount: 0,
      totalRequests: 0,
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: [],
    };

    // Alert state to prevent alert flooding
    this.alertStates = {
      errorRate: false,
      responseTime: false,
      memoryUsage: false,
      cpuUsage: false,
    };
  }

  // Record a request for metrics
  recordRequest(statusCode, responseTimeMs) {
    this.metrics.totalRequests++;
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }
    this.metrics.responseTimes.push(responseTimeMs);

    // Keep only last 1000 response times for rolling average
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }

    // Check if we should trigger alerts
    this.checkAlerts();
  }

  // Record system metrics
  recordSystemMetrics(memoryUsagePercent, cpuUsagePercent) {
    this.metrics.memoryUsage.push(memoryUsagePercent);
    this.metrics.cpuUsage.push(cpuUsagePercent);

    // Keep only last 60 samples (5 minutes at 5-second intervals)
    if (this.metrics.memoryUsage.length > 60) {
      this.metrics.memoryUsage.shift();
      this.metrics.cpuUsage.shift();
    }

    this.checkAlerts();
  }

  // Check if any metrics exceed thresholds and trigger alerts
  checkAlerts() {
    // Skip alerting in development
    if (process.env.NODE_ENV === 'development') return;

    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.errorCount / this.metrics.totalRequests 
      : 0;

    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const avgMemoryUsage = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length
      : 0;

    const avgCpuUsage = this.metrics.cpuUsage.length > 0
      ? this.metrics.cpuUsage.reduce((a, b) => a + b, 0) / this.metrics.cpuUsage.length
      : 0;

    // Error rate alert
    if (errorRate > this.alertThresholds.errorRate && !this.alertStates.errorRate) {
      this.triggerAlert('high_error_rate', {
        current: errorRate.toFixed(4),
        threshold: this.alertThresholds.errorRate,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(this.alertThresholds.errorRate * 100).toFixed(2)}%`
      });
      this.alertStates.errorRate = true;
    } else if (errorRate <= this.alertThresholds.errorRate && this.alertStates.errorRate) {
      this.resolveAlert('high_error_rate');
      this.alertStates.errorRate = false;
    }

    // Response time alert
    if (avgResponseTime > this.alertThresholds.responseTime && !this.alertStates.responseTime) {
      this.triggerAlert('high_response_time', {
        current: `${Math.round(avgResponseTime)}ms`,
        threshold: `${this.alertThresholds.responseTime}ms`,
        message: `Average response time ${Math.round(avgResponseTime)}ms exceeds threshold ${this.alertThresholds.responseTime}ms`
      });
      this.alertStates.responseTime = true;
    } else if (avgResponseTime <= this.alertThresholds.responseTime && this.alertStates.responseTime) {
      this.resolveAlert('high_response_time');
      this.alertStates.responseTime = false;
    }

    // Memory usage alert
    if (avgMemoryUsage > this.alertThresholds.memoryUsage && !this.alertStates.memoryUsage) {
      this.triggerAlert('high_memory_usage', {
        current: `${Math.round(avgMemoryUsage)}%`,
        threshold: `${this.alertThresholds.memoryUsage}%`,
        message: `Memory usage ${Math.round(avgMemoryUsage)}% exceeds threshold ${this.alertThresholds.memoryUsage}%`
      });
      this.alertStates.memoryUsage = true;
    } else if (avgMemoryUsage <= this.alertThresholds.memoryUsage && this.alertStates.memoryUsage) {
      this.resolveAlert('high_memory_usage');
      this.alertStates.memoryUsage = false;
    }

    // CPU usage alert
    if (avgCpuUsage > this.alertThresholds.cpuUsage && !this.alertStates.cpuUsage) {
      this.triggerAlert('high_cpu_usage', {
        current: `${Math.round(avgCpuUsage)}%`,
        threshold: `${this.alertThresholds.cpuUsage}%`,
        message: `CPU usage ${Math.round(avgCpuUsage)}% exceeds threshold ${this.alertThresholds.cpuUsage}%`
      });
      this.alertStates.cpuUsage = true;
    } else if (avgCpuUsage <= this.alertThresholds.cpuUsage && this.alertStates.cpuUsage) {
      this.resolveAlert('high_cpu_usage');
      this.alertStates.cpuUsage = false;
    }
  }

  // Trigger an alert
  triggerAlert(alertType, details) {
    logger.warn(`ALERT_TRIGGERED: ${alertType}`, {
      alertType,
      ...details,
      timestamp: new Date().toISOString(),
    });

    // Here you would integrate with actual alerting services like:
    // - PagerDuty
    // - Slack webhooks
    // - Email notifications
    // - Webhook endpoints
    // - SMS services

    // Example: Send to monitoring system via webhook
    if (process.env.MONITORING_WEBHOOK_URL) {
      // This would be implemented based on your monitoring system
      // fetch(process.env.MONITORING_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     alert: alertType,
      //     ...details,
      //     service: 'vox-backend',
      //     environment: process.env.NODE_ENV,
      //     timestamp: new Date().toISOString(),
      //   })
      // }).catch(err => logger.error('Failed to send alert to webhook', { error: err.message }));
    }
  }

  // Resolve an alert
  resolveAlert(alertType) {
    logger.info(`ALERT_RESOLVED: ${alertType}`, {
      alertType,
      timestamp: new Date().toISOString(),
    });

    // Send resolution notification if needed
    if (process.env.MONITORING_WEBHOOK_URL) {
      // Implementation would go here
    }
  }

  // Get current metrics for health checks or monitoring endpoints
  getMetrics() {
    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.errorCount / this.metrics.totalRequests 
      : 0;

    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const avgMemoryUsage = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length
      : 0;

    const avgCpuUsage = this.metrics.cpuUsage.length > 0
      ? this.metrics.cpuUsage.reduce((a, b) => a + b, 0) / this.metrics.cpuUsage.length
      : 0;

    return {
      errorRate: Number(errorRate.toFixed(4)),
      totalRequests: this.metrics.totalRequests,
      errorCount: this.metrics.errorCount,
      avgResponseTimeMs: Math.round(avgResponseTime),
      avgMemoryUsagePercent: Math.round(avgMemoryUsage),
      avgCpuUsagePercent: Math.round(avgCpuUsage),
      timestamp: new Date().toISOString(),
    };
  }

  // Log metrics to the logging system for external consumption
  logMetrics() {
    const metrics = this.getMetrics();
    logMetric('vox_metrics', 1, {
      ...metrics,
      service: 'vox-backend',
    });
  }
}

// Create and export a singleton instance
export const monitoringService = new MonitoringService();

// Export helper functions for easy use
export function recordRequest(statusCode, responseTimeMs) {
  monitoringService.recordRequest(statusCode, responseTimeMs);
}

export function recordSystemMetrics(memoryUsagePercent, cpuUsagePercent) {
  monitoringService.recordSystemMetrics(memoryUsagePercent, cpuUsagePercent);
}

export function getMetrics() {
  return monitoringService.getMetrics();
}

export function logMetrics() {
  monitoringService.logMetrics();
}

export default monitoringService;