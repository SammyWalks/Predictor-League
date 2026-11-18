const TOKEN_KEY = 'predictor-session'
const LEGACY_KEY = 'predictor-league'

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
    // Old builds stored the whole league, including removed players, in the browser.
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Private mode can block storage. The session still works until refresh.
  }
}
