import { ArrowLeft, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorStateProps {
  title: string
  description: string
  canRetry?: boolean
}

export function ErrorState({ title, description, canRetry = false }: ErrorStateProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-5">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="flex flex-col items-center px-6 py-8 text-center">
          <TriangleAlert className="mb-5 size-7 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant={canRetry ? 'outline' : 'default'}>
              <a href="/"><ArrowLeft aria-hidden="true" />Back to home</a>
            </Button>
            {canRetry && (
              <Button onClick={() => window.location.reload()}>
                <RotateCcw aria-hidden="true" />Try again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
