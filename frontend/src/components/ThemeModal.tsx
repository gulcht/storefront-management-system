import { useTheme } from './theme-provider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor, Palette } from 'lucide-react'

export function ThemeModal() {
  const { theme, setTheme } = useTheme()

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" title="Customize theme" />}>
        <Palette className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Customize Theme</DialogTitle>
          <DialogDescription>
            Select your preferred display theme for the storefront portal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            className="flex flex-col gap-2 h-20 justify-center rounded-2xl"
            onClick={() => setTheme('light')}
          >
            <Sun className="h-5 w-5" />
            <span className="text-xs">Light</span>
          </Button>

          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            className="flex flex-col gap-2 h-20 justify-center rounded-2xl"
            onClick={() => setTheme('dark')}
          >
            <Moon className="h-5 w-5" />
            <span className="text-xs">Dark</span>
          </Button>

          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            className="flex flex-col gap-2 h-20 justify-center rounded-2xl"
            onClick={() => setTheme('system')}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-xs">System</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
