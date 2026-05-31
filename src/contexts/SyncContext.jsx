import { createContext, useContext, useState, useCallback } from 'react'

// 包住寫入操作以驅動 header 的同步狀態徽章 (沿用原 App 的 withSync 概念)
const SyncContext = createContext({ status: 'synced', run: async (fn) => fn() })
export const useSync = () => useContext(SyncContext)

export function SyncProvider({ children }) {
  const [status, setStatus] = useState('synced')

  const run = useCallback(async (fn) => {
    setStatus('syncing')
    try {
      const r = await fn()
      setStatus('synced')
      return r
    } catch (e) {
      console.error(e)
      setStatus('error')
      throw e
    }
  }, [])

  return <SyncContext.Provider value={{ status, run }}>{children}</SyncContext.Provider>
}
