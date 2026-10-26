import { useEffect, useState } from 'react'
import type { HostQuitPrompt } from '../../../shared/hostSnapshot'

/**
 * O processo principal pede confirmação antes de fechar com gente na call.
 * Exemplo: `const prompt = useHostQuitPrompt()`.
 */
export function useHostQuitPrompt(): { prompt: HostQuitPrompt | null; confirm: () => void; dismiss: () => void } {
  const [prompt, setPrompt] = useState<HostQuitPrompt | null>(null)

  useEffect(() => window.radcord?.onHostQuitPrompt(setPrompt), [])

  return {
    prompt,
    confirm: () => {
      setPrompt(null)
      void window.radcord?.confirmHostQuit()
    },
    dismiss: () => {
      setPrompt(null)
      void window.radcord?.dismissHostQuit()
    },
  }
}
