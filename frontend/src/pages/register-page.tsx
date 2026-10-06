import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Eye, EyeOff, LoaderCircle, UserPlus } from 'lucide-react'
import { registerAccount } from '@/api/auth'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { registrationError, validateRegistration, type RegistrationErrors, type RegistrationField } from '@/lib/registration'

const fields = [
  { name: 'first_name', label: 'First name', autocomplete: 'given-name', placeholder: 'First name' },
  { name: 'last_name', label: 'Last name', autocomplete: 'family-name', placeholder: 'Last name' },
  { name: 'email', label: 'Email', autocomplete: 'username', placeholder: 'you@company.com' },
  { name: 'password', label: 'Password', autocomplete: 'new-password', placeholder: 'Create a password' },
  { name: 'confirm_password', label: 'Confirm password', autocomplete: 'new-password', placeholder: 'Repeat your password' },
] as const

export function RegisterPage() {
  const { login } = useAuth()
  const [values, setValues] = useState<Record<RegistrationField, string>>({ first_name: '', last_name: '', email: '', password: '', confirm_password: '' })
  const [visible, setVisible] = useState({ password: false, confirm_password: false })
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [phase, setPhase] = useState('Creating account…')
  const submitting = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    // Autofill can update an input without emitting React's onChange event.
    // Snapshot the actual form once, before disabling or clearing any fields.
    const submitted = new FormData(event.currentTarget)
    const read = (name: RegistrationField) => {
      const value = submitted.get(name)
      return typeof value === 'string' ? value : ''
    }
    const input = { first_name: read('first_name').trim(), last_name: read('last_name').trim(), email: read('email').trim(), password: read('password') }
    const next = validateRegistration(input, read('confirm_password'))
    setErrors(next); setError('')
    const invalid = fields.find((field) => next[field.name])
    if (invalid) { formRef.current?.querySelector<HTMLInputElement>(`[name="${invalid.name}"]`)?.focus(); return }
    submitting.current = true; setPending(true); setPhase('Creating account…')
    try {
      await registerAccount(input)
      setPhase('Signing in…')
      try { await login({ email: input.email, password: input.password }) }
      catch { setError('Your account was created, but sign-in could not be completed. Use Sign in to continue.') }
    } catch (failure) { setError(registrationError(failure)) }
    finally {
      setValues((old) => ({ ...old, password: '', confirm_password: '' }))
      setVisible({ password: false, confirm_password: false })
      submitting.current = false; setPending(false)
    }
  }

  return <AuthShell skipLabel="Skip to create account">
    <span className="mb-7 inline-flex size-11 items-center justify-center rounded-xl border bg-card shadow-xs"><UserPlus className="size-5" strokeWidth={1.5} aria-hidden="true" /></span>
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.17em] text-muted-foreground">Your workspace starts here</p>
    <h1 className="text-3xl font-semibold tracking-tight">Create an account.</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Join Smart Inventory and bring your inventory into focus.</p>
    <form ref={formRef} noValidate onSubmit={submit} className="mt-9 space-y-5" aria-busy={pending}>
      {fields.map((field) => {
        const passwordField = field.name === 'password' || field.name === 'confirm_password' ? field.name : null
        const shown = passwordField ? visible[passwordField] : false
        const fieldError = errors[field.name]
        return <div key={field.name}>
          <label htmlFor={`register-${field.name}`} className="mb-2 block text-sm font-medium">{field.label}</label>
          <div className={passwordField ? 'relative' : undefined}>
            <input id={`register-${field.name}`} name={field.name} type={passwordField ? shown ? 'text' : 'password' : field.name === 'email' ? 'email' : 'text'} autoComplete={field.autocomplete} inputMode={field.name === 'email' ? 'email' : undefined} autoCapitalize={field.name === 'email' || passwordField ? 'none' : 'words'} spellCheck={field.name === 'email' || !!passwordField ? false : undefined} required placeholder={field.placeholder} value={values[field.name]} disabled={pending} onChange={(event) => { const value = event.currentTarget.value; setValues((old) => ({ ...old, [field.name]: value })); setErrors((old) => ({ ...old, [field.name]: undefined, ...(field.name === 'password' ? { confirm_password: undefined } : {}) })); setError('') }} className={`auth-input${passwordField ? ' pr-12' : ''}`} aria-invalid={!!fieldError} aria-describedby={[field.name === 'password' ? 'register-password-hint' : '', fieldError ? `register-${field.name}-error` : ''].filter(Boolean).join(' ') || undefined} />
            {passwordField && <button type="button" disabled={pending} onClick={() => setVisible((old) => ({ ...old, [passwordField]: !old[passwordField] }))} aria-label={`${shown ? 'Hide' : 'Show'} ${passwordField === 'confirm_password' ? 'confirm password' : 'password'}`} aria-pressed={shown} className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">{shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button>}
          </div>
          {field.name === 'password' && <p id="register-password-hint" className="mt-2 text-xs leading-5 text-muted-foreground">Use 12–128 characters with more than one distinct character.</p>}
          {fieldError && <p id={`register-${field.name}-error`} className="mt-2 text-xs text-destructive">{fieldError}</p>}
        </div>
      })}
      {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm leading-5 text-destructive">{error}</div>}
      <Button type="submit" disabled={pending} className="h-12 w-full justify-between px-4">{pending ? phase : 'Create account'}{pending ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}</Button>
      {pending && <span role="status" className="sr-only">{phase}</span>}
    </form>
    <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link></p>
  </AuthShell>
}
