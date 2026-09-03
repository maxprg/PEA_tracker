'use client'

import { useTheme } from 'next-themes'
import { useLanguage } from './LanguageProvider'
import { Moon, Sun } from 'lucide-react'

export function ThemeLanguageToggle() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg transition"
        title="Basculer le thème"
      >
        <Sun size={16} className="hidden dark:block" />
        <Moon size={16} className="block dark:hidden" />
      </button>

      {/* Language Toggle */}
      <button
        onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
        className="px-2 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg transition uppercase"
        title="Changer de langue"
      >
        {language === 'fr' ? 'FR' : 'EN'}
      </button>
    </div>
  )
}

