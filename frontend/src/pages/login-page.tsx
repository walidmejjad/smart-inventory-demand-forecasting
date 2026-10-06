import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { ApiError } from '@/api/errors'
import { Link } from 'react-router'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

function loginError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email or password is incorrect.'
    if (!error.status || error.status === 502 || error.status === 503 || error.status === 504) return 'Unable to connect to the server. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const submitting = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const next = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter a valid email address.',
      password: password.length ? undefined : 'Enter your password.',
    }
    setErrors(next)
    setError('')
    if (next.email || next.password) {
      (next.email ? emailRef : passwordRef).current?.focus()
      return
    }
    submitting.current = true
    setPending(true)
    try { await login({ email: email.trim(), password }) }
    catch (failure) { setError(loginError(failure)) }
    finally { submitting.current = false; setPending(false) }
  }

  return <AuthShell>
    <span className="mb-7 inline-flex size-11 items-center justify-center rounded-xl border bg-card shadow-xs"><LockKeyhole className="size-5" strokeWidth={1.5} aria-hidden="true" /></span>
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.17em] text-muted-foreground">Your workspace awaits</p>
    <h1 className="text-3xl font-semibold tracking-tight">Welcome back.</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to Smart Inventory to continue.</p>
    <form noValidate onSubmit={submit} className="mt-9 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
        <input ref={emailRef} id="email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required placeholder="you@company.com" value={email} disabled={pending} onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); setError('') }} className="auth-input" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
        {errors.email && <p id="email-error" className="mt-2 text-xs text-destructive">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
        <div className="relative">
          <input ref={passwordRef} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required placeholder="Enter your password" value={password} disabled={pending} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); setError('') }} className="auth-input pr-12" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} />
          <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground">{visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button>
        </div>
        {errors.password && <p id="password-error" className="mt-2 text-xs text-destructive">{errors.password}</p>}
      </div>
      {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm leading-5 text-destructive">{error}</div>}
      <Button type="submit" disabled={pending} className="h-12 w-full justify-between px-4">{pending ? 'Signing in…' : 'Sign in'}{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}</Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Use the account provided by your administrator.</p>
    </form>
    <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">New to Smart Inventory? <Link to="/register" className="font-medium text-foreground underline underline-offset-4">Create an account</Link></p>
  </AuthShell>
}
