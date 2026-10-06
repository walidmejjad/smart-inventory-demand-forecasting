import { Component, type ErrorInfo, type PropsWithChildren } from 'react'
import { ErrorState } from '@/components/error-state'

export class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Application render error', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState title="Something went wrong" description="The workspace could not be displayed. Please reload and try again." canRetry />
    }
    return this.props.children
  }
}
