const axios = require('axios')
const fetch = require('node-fetch')

const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 500
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3
const DEFAULT_CIRCUIT_OPEN_MS = 30000

const circuitState = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getCircuit = (key) => {
  if (!circuitState.has(key)) {
    circuitState.set(key, { failures: 0, openedAt: 0 })
  }
  return circuitState.get(key)
}

const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500

const shouldRetryError = (error) => {
  const status = error?.response?.status || error?.status
  if (status && isRetryableStatus(status)) return true

  const code = error?.code
  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)
}

const withRetry = async (fn, {
  retries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS
} = {}) => {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === retries || !shouldRetryError(error)) break
      await sleep(retryDelayMs * Math.pow(2, attempt))
    }
  }
  throw lastError
}

const withCircuitBreaker = async (key, fn, {
  failureThreshold = DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
  openMs = DEFAULT_CIRCUIT_OPEN_MS
} = {}) => {
  const circuit = getCircuit(key)
  const now = Date.now()

  if (circuit.openedAt && (now - circuit.openedAt < openMs)) {
    throw new Error(`Circuit breaker aktif untuk ${key}`)
  }

  try {
    const result = await fn()
    circuit.failures = 0
    circuit.openedAt = 0
    return result
  } catch (error) {
    circuit.failures += 1
    if (circuit.failures >= failureThreshold) {
      circuit.openedAt = Date.now()
    }
    throw error
  }
}

const fetchJsonWithPolicy = async (url, {
  key,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  circuitFailureThreshold = DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
  circuitOpenMs = DEFAULT_CIRCUIT_OPEN_MS,
  ...init
} = {}) => {
  const circuitKey = key || `fetch:${new URL(url).host}`

  return withCircuitBreaker(circuitKey, () => withRetry(async () => {
    const response = await fetch(url, { ...init, timeout: timeoutMs })
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    return response.json()
  }, { retries, retryDelayMs }), {
    failureThreshold: circuitFailureThreshold,
    openMs: circuitOpenMs
  })
}

const axiosBufferWithPolicy = async (url, {
  key,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  circuitFailureThreshold = DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
  circuitOpenMs = DEFAULT_CIRCUIT_OPEN_MS,
  ...options
} = {}) => {
  const circuitKey = key || `axios:${new URL(url).host}`

  return withCircuitBreaker(circuitKey, () => withRetry(async () => {
    const response = await axios({
      method: 'get',
      url,
      timeout: timeoutMs,
      headers: {
        DNT: 1,
        'Upgrade-Insecure-Request': 1
      },
      responseType: 'arraybuffer',
      ...options
    })
    return response.data
  }, { retries, retryDelayMs }), {
    failureThreshold: circuitFailureThreshold,
    openMs: circuitOpenMs
  })
}

module.exports = {
  fetchJsonWithPolicy,
  axiosBufferWithPolicy,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
  DEFAULT_CIRCUIT_OPEN_MS
}
