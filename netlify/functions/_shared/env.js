export function readEnv(name) {
  try {
    if (typeof Netlify !== 'undefined' && Netlify.env) {
      const value = Netlify.env.get(name)
      if (value) return value
    }
  } catch {
    // process.env covers local runs of the same file.
  }
  return process.env[name] || ''
}
