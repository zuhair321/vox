// Resilience patterns for external service calls: circuit breaker, retry with exponential backoff, and health checks

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'closed',      // Normal operation
  OPEN: 'open',          // Failing fast
  HALF_OPEN: 'half_open' // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 60 seconds
    this.expectedException = options.expectedException || Error;
    this.timeout = options.timeout || 30000; // 30 seconds
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    const now = Date.now();
    
    // Check if we should attempt the call
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (now < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Move to half-open to test if service recovered
      this.state = CIRCUIT_STATES.HALF_OPEN;
    }

    try {
      // Apply timeout to the function call
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), this.timeout)
        )
      ]);
      
      // Success - reset failure count and close circuit if half-open
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count and potentially open circuit
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.state = CIRCUIT_STATES.CLOSED;
    }
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttempt = Date.now() + this.recoveryTimeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt
    };
  }
}

// Retry utility with exponential backoff
class RetryPolicy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 10000; // 10 seconds
    this.exponentialFactor = options.exponentialFactor || 2;
    this.jitter = options.jitter !== undefined ? options.jitter : true;
    this.retryableErrors = options.retryableErrors || [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNABORTED',
      'NetworkError',
      'TimeoutError'
    ];
  }

  async execute(fn) {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // If this was the last attempt, don't wait
        if (attempt === this.maxAttempts - 1) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  isRetryableError(error) {
    if (!error) return false;
    
    // Check error code
    if (error.code && this.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check error message for common retryable patterns
    const errorMessage = (error.message || '').toLowerCase();
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'failed to fetch',
      'dns',
      'temporary'
    ];
    
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * (exponentialFactor ^ attempt)
    let delay = this.baseDelay * Math.pow(this.exponentialFactor, attempt);
    
    // Apply maximum delay cap
    delay = Math.min(delay, this.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += Math.random() * jitterAmount * 2 - jitterAmount;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Health check cascading utility
class HealthChecker {
  constructor() {
    this.dependencies = new Map();
  }

  registerDependency(name, checkFn, options = {}) {
    this.dependencies.set(name, {
      checkFn,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      lastCheck: null,
      lastResult: null,
      consecutiveFailures: 0
    });
  }

  async checkAll() {
    const results = {};
    let allHealthy = true;
    let criticalHealthy = true;

    for (const [name, dependency] of this.dependencies.entries()) {
      try {
        const result = await Promise.race([
          dependency.checkFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timed out')), dependency.timeout)
          )
        ]);
        
        dependency.lastCheck = Date.now();
        dependency.lastResult = { status: 'healthy', data: result };
        dependency.consecutiveFailures = 0;
        
        results[name] = { status: 'healthy', data: result, timestamp: dependency.lastCheck };
      } catch (error) {
        dependency.lastCheck = Date.now();
        dependency.lastResult = { status: 'unhealthy', error: error.message };
        dependency.consecutiveFailures++;
        
        results[name] = { 
          status: 'unhealthy', 
          error: error.message, 
          consecutiveFailures: dependency.consecutiveFailures,
          timestamp: dependency.lastCheck
        };
        
        if (dependency.critical) {
          criticalHealthy = false;
        }
        allHealthy = false;
      }
    }

    return {
      overall: allHealthy && criticalHealthy ? 'healthy' : 'unhealthy',
      critical: criticalHealthy,
      dependencies: results,
      timestamp: Date.now()
    };
  }

  getDependencyStatus(name) {
    const dependency = this.dependencies.get(name);
    if (!dependency) return null;
    
    return {
      name,
      lastCheck: dependency.lastCheck,
      lastResult: dependency.lastResult,
      consecutiveFailures: dependency.consecutiveFailures
    };
  }
}

// Global instances for use throughout the application
const circuitBreakers = new Map();
const retryPolicies = new Map();
const healthChecker = new HealthChecker();

// Factory functions for easy access
export function getCircuitBreaker(name, options) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(options));
  }
  return circuitBreakers.get(name);
}

export function getRetryPolicy(name, options) {
  if (!retryPolicies.has(name)) {
    retryPolicies.set(name, new RetryPolicy(options));
  }
  return retryPolicies.get(name);
}

export function registerHealthCheck(name, checkFn, options = {}) {
  healthChecker.registerDependency(name, checkFn, options);
}

export async function checkHealth() {
  return await healthChecker.checkAll();
}

// Pre-configured policies for common external services
export const resendCircuitBreaker = getCircuitBreaker('resend', {
  failureThreshold: 3,
  recoveryTimeout: 120000, // 2 minutes
  timeout: 15000 // 15 seconds
});

export const resendRetryPolicy = getRetryPolicy('resend', {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialFactor: 2
});

// Register health checks for external services
registerHealthCheck('resend', async () => {
  // Simple health check - just verify we can instantiate the client
  const client = require('./services/email.service.js').getClient();
  if (!client) {
    throw new Error('Resend client not available - missing API key');
  }
  return { status: 'client_available' };
}, { critical: false }); // Email is not critical for core functionality

registerHealthCheck('redis', async () => {
  const { getCache } = require('./redis.js');
  const client = await getCache();
  if (!client) {
    throw new Error('Redis cache client not available');
  }
  await client.ping();
  return { status: 'redis_ping_success' };
}, { critical: true }); // Redis is critical for pub/sub and caching

registerHealthCheck('database', async () => {
  const { getPrisma } = require('./prisma.js');
  const prisma = await getPrisma();
  if (!prisma) {
    throw new Error('Prisma client not available');
  }
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'database_query_success' };
}, { critical: true }); // Database is critical