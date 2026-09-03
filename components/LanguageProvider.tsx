'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { fr, en, Dictionary } from '@/lib/i18n/dictionaries'

type Language = 'fr' | 'en'

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language
    if (saved === 'en' || saved === 'fr') setLanguage(saved)
    else {
      // Auto-detect
      const browserLang = navigator.language.split('-')[0]
      if (browserLang === 'en') setLanguage('en')
    }
    setMounted(true)
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  const dictionary = language === 'fr' ? fr : en

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: dictionary }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Default fallback if used outside provider (e.g., during tests)
    return { language: 'fr' as Language, setLanguage: () => {}, t: fr }
  }
  return context
}

