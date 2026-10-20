import { randomBytes } from 'node:crypto'

// Only in-memory, session-bound work. Polling renews the lease; abandoned work
// is cancelled and its sources/results are never written to disk.
export function createInferenceJobs({ leaseMs = 90000, timeoutMs = 900000, retentionMs = 600000, now = Date.now } = {}) {
  const jobs = new Map()
  const terminal = job => job.state !== 'running'
  function expire(job) {
    if (terminal(job)) return
    const expired = now() - job.started >= timeoutMs
    if (expired || now() - job.touched >= leaseMs) {
      job.state = 'cancelled'
      job.error = expired ? '本次解读等待过久，已停止。请减少资料后重试。' : '页面长时间未保持连接，本次解读已停止。资料仍留在原页面。'
      job.controller.abort()
      job.finished = now()
    }
  }
  function sweep() {
    for (const [id, job] of jobs) {
      expire(job)
      if (terminal(job) && now() - job.finished >= retentionMs) jobs.delete(id)
    }
  }
  return {
    start(owner, work, finished = () => {}) {
      sweep()
      const id = randomBytes(24).toString('hex'), controller = new AbortController()
      const job = { owner, controller, state: 'running', progress: '正在准备模型', started: now(), touched: now() }
      jobs.set(id, job)
      const timer = setInterval(() => { expire(job) }, Math.min(10000, leaseMs, timeoutMs))
      timer.unref?.()
      Promise.resolve().then(() => work(controller.signal, message => { if (!terminal(job)) job.progress = message })).then(result => {
        if (!terminal(job)) { job.result = result; job.state = 'completed' }
      }, error => {
        if (!terminal(job)) {
          job.state = 'failed'
          job.error = error.status ? error.message : '本次解读未完成，没有生成新结论。资料仍留在原页面。'
          job.code = error.code ?? 'inference_failed'
        }
      }).finally(() => {
        clearInterval(timer); job.finished = now(); finished()
        const cleanup = setTimeout(() => { delete job.result; jobs.delete(id) }, retentionMs)
        cleanup.unref?.()
      })
      return id
    },
    read(id, owner) {
      sweep()
      const job = jobs.get(id)
      if (!job || job.owner !== owner) return null
      job.touched = now()
      return { state: job.state, progress: job.progress, elapsedSeconds: Math.floor(((job.finished ?? now()) - job.started) / 1000), ...(job.result ? { result: job.result } : {}), ...(job.error ? { error: job.error, code: job.code } : {}) }
    },
    cancel(id, owner) {
      const job = jobs.get(id)
      if (!job || job.owner !== owner) return false
      if (!terminal(job)) { job.state = 'cancelled'; job.finished = now(); job.controller.abort() }
      delete job.result
      jobs.delete(id)
      return true
    },
  }
}
