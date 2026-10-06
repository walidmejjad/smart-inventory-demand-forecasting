import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorState } from '@/components/error-state'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <ErrorState
      title={isNotFound ? 'This page isn’t here' : 'Something went wrong'}
      description={isNotFound
        ? 'This address does not exist. Return to the workspace to continue.'
        : 'The workspace could not be loaded. Please try again.'}
      canRetry={!isNotFound}
    />
  )
}
