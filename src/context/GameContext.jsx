import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../data/api'
import { loadToken, saveToken } from '../data/session'
import { friendlyError } from '../supabase'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [token, setToken] = useState(() => loadToken())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(loadToken()))
  const [ready, setReady] = useState(() => !loadToken())
  const [error, setError] = useState('')
  const tokenRef = useRef(token)
  tokenRef.current = token

  useEffect(() => {
    try {
      localStorage.removeItem('predictor-league')
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const refresh = useCallback(async () => {
    const current = tokenRef.current
    if (!current) {
      setData(null)
      setReady(true)
      setLoading(false)
      return null
    }
    try {
      const next = await api.loadGame(current)
      setData(next)
      setError('')
      return next
    } catch (err) {
      const message = friendlyError(err)
      if (/session expired|not logged in/i.test(message)) {
        saveToken('')
        setToken('')
        setData(null)
        setError('')
      } else {
        setError(message)
      }
      return null
    } finally {
      setLoading(false)
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setData(null)
      setReady(true)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    refresh()
    const unsubscribe = api.subscribe(() => {
      refresh()
    })
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 12000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, refresh])

  const login = useCallback(async (name, password) => {
    const result = await api.login(name, password)
    if (!result?.token) throw new Error('Could not log in')
    saveToken(result.token)
    setToken(result.token)
    setLoading(true)
  }, [])

  const logout = useCallback(async () => {
    const current = tokenRef.current
    saveToken('')
    setToken('')
    setData(null)
    setError('')
    await api.logout(current)
  }, [])

  const run = useCallback(async (action) => {
    const result = await action()
    await refresh()
    return result
  }, [refresh])

  const value = useMemo(() => {
    const me = data?.me || null
    const players = data?.players || []
    const currentWeek = data?.currentWeek ?? null
    const fixtures = (data?.fixtures || []).filter((fixture) => fixture.week === currentWeek)
    const allFixtures = data?.fixtures || []
    const allPicks = data?.publishedPicks || []
    const revealedWeeks = Array.isArray(data?.revealedWeeks) ? data.revealedWeeks : null
    const picksRevealed = typeof data?.picksRevealed === 'boolean' ? data.picksRevealed : true
    const publishedPicks = allPicks.filter((pick) => pick.week === currentWeek)
    const allEntries = data?.entries || []
    const entries = allEntries.filter((entry) => entry.week === currentWeek)
    const myPredictions = (data?.myPredictions || []).filter((prediction) => prediction.week === currentWeek)
    const locked = Boolean(me && entries.some((entry) => entry.userId === me.id))
    const requiredFixtures = fixtures.filter((fixture) => fixture.hardest)
    const requiredPredictions = myPredictions.filter((prediction) => requiredFixtures.some((fixture) => fixture.id === prediction.fixtureId))
    const mineScored = locked && requiredPredictions.length > 0 && requiredPredictions.every((prediction) => prediction.pointsAwarded != null)
    const minePartial = locked && requiredPredictions.some((prediction) => prediction.pointsAwarded != null) && !mineScored

    return {
      ready,
      loading,
      error,
      refresh,
      me,
      players,
      currentWeek,
      season: data?.season || '',
      leagueId: data?.leagueId || '4328',
      fixtures,
      allFixtures,
      allPicks,
      publishedPicks,
      picksRevealed,
      revealedWeeks,
      allEntries,
      entries,
      myPredictions,
      locked,
      requiredFixtures,
      status: mineScored ? 'scored' : minePartial ? 'partial' : locked ? 'locked' : 'open',
      login,
      logout,
      savePrediction: (fixtureId, score) => run(() => api.savePrediction(tokenRef.current, fixtureId, score)),
      lockPredictions: () => run(() => api.lockPredictions(tokenRef.current)),
      updateProfile: (profile) => run(() => api.updateProfile(tokenRef.current, profile)),
      changePassword: (currentPassword, nextPassword) => run(() => api.changePassword(tokenRef.current, currentPassword, nextPassword)),
      adminSaveResult: (fixtureId, home, away) => run(() => api.adminSaveResult(tokenRef.current, fixtureId, home, away)),
      adminCalculate: (week) => run(() => api.adminCalculate(tokenRef.current, week)),
      adminSaveFixture: (fixture) => run(() => api.adminSaveFixture(tokenRef.current, fixture)),
      adminSetWeek: (week) => run(() => api.adminSetWeek(tokenRef.current, week)),
      adminLoadPlayerPredictions: (userId) => api.adminLoadPlayerPredictions(tokenRef.current, userId),
      adminSavePlayerPredictions: (userId, scores, lock) => run(() => api.adminSavePlayerPredictions(tokenRef.current, userId, scores, lock)),
    }
  }, [data, ready, loading, error, refresh, login, logout, run])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside GameProvider')
  return value
}
