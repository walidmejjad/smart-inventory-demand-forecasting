import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { catalogError } from '@/lib/catalog'

export function useCatalogForm<T extends Record<string, string>>(initial: T, validate: (values: T) => Partial<Record<keyof T, string>>, onSave: (values: T) => Promise<void>) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [error, setError] = useState('')
  const pending = useRef(false)
  function bind(key: keyof T) {
    return { value: values[key], onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((old) => ({ ...old, [key]: event.target.value })); setErrors((old) => ({ ...old, [key]: undefined })); setError('')
    } }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const issues = validate(values)
    setErrors(issues); setError('')
    if (Object.keys(issues).length) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    pending.current = true
    try { await onSave(values) } catch (failure) { setError(catalogError(failure)) }
    finally { pending.current = false }
  }
  return { values, errors, error, bind, submit }
}
