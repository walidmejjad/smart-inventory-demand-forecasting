import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'Use system theme', icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div role="group" aria-label="Appearance" className="flex items-center gap-0.5 rounded-xl border bg-muted/60 p-1">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'size-8 rounded-lg text-muted-foreground sm:size-9',
            theme === value && 'bg-background text-foreground shadow-xs hover:bg-background',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
