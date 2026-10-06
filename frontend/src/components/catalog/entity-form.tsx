import { Button } from '@/components/ui/button'
import { Field } from '@/components/catalog/catalog-ui'
import { useCatalogForm } from '@/hooks/use-catalog-form'
import { fieldAria, optionalText } from '@/lib/catalog'
import type { Category, CategoryInput, Supplier, SupplierInput } from '@/types/catalog'

type EntityFormProps = { busy: boolean; onCancel: () => void } & (
  { kind: 'category'; record: Category | null; onSave: (input: CategoryInput) => Promise<void> } |
  { kind: 'supplier'; record: Supplier | null; onSave: (input: SupplierInput) => Promise<void> }
)

export function EntityForm(props: EntityFormProps) {
  const { kind, busy, onCancel } = props
  const form = useCatalogForm({ name: props.record?.name ?? '', description: kind === 'category' ? props.record?.description ?? '' : '', email: props.kind === 'supplier' ? props.record?.email ?? '' : '', phone: props.kind === 'supplier' ? props.record?.phone ?? '' : '', address: props.kind === 'supplier' ? props.record?.address ?? '' : '' }, (values) => {
    const errors: Partial<Record<keyof typeof values, string>> = {}
    const maxName = kind === 'category' ? 100 : 255
    if (!values.name.trim() || values.name.trim().length > maxName) errors.name = `Enter a name of 1–${maxName} characters.`
    if (kind === 'supplier') {
      if (values.email.trim() && (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))) errors.email = 'Enter a valid email address (up to 254 characters).'
      if (values.phone.trim().length > 32) errors.phone = 'Use up to 32 characters for the phone number.'
    }
    return errors
  }, async (values) => {
    if (props.kind === 'category') await props.onSave({ name: values.name.trim(), description: optionalText(values.description) })
    else await props.onSave({ name: values.name.trim(), email: optionalText(values.email.trim()), phone: optionalText(values.phone.trim()), address: optionalText(values.address) })
  })
  return <form noValidate onSubmit={form.submit} className="space-y-5" aria-busy={busy}>
    <fieldset disabled={busy} className="space-y-5">
      <Field name={`${kind}-name`} label={kind === 'category' ? 'Category name' : 'Supplier name'} error={form.errors.name}><input id={`${kind}-name`} className="catalog-input" required maxLength={kind === 'category' ? 100 : 255} placeholder={kind === 'category' ? 'Category name' : 'Supplier name'} {...form.bind('name')} {...fieldAria(`${kind}-name`, form.errors.name)} /></Field>
      {kind === 'category' ? <Field name="category-description" label="Description (optional)"><textarea id="category-description" className="catalog-input min-h-24 resize-y" {...form.bind('description')} placeholder="Describe this inventory group" /></Field> : <>
        <Field name="supplier-email" label="Email (optional)" error={form.errors.email}><input id="supplier-email" type="email" autoComplete="email" className="catalog-input" maxLength={254} placeholder="contact@supplier.com" {...form.bind('email')} {...fieldAria('supplier-email', form.errors.email)} /></Field>
        <Field name="supplier-phone" label="Phone (optional)" error={form.errors.phone}><input id="supplier-phone" type="tel" autoComplete="tel" className="catalog-input" maxLength={32} placeholder="Phone number" {...form.bind('phone')} {...fieldAria('supplier-phone', form.errors.phone)} /></Field>
        <Field name="supplier-address" label="Address (optional)"><textarea id="supplier-address" autoComplete="street-address" className="catalog-input min-h-24 resize-y" {...form.bind('address')} placeholder="Supplier address" /></Field>
      </>}
    </fieldset>
    {form.error && <p role="alert" className="text-xs leading-5 text-destructive">{form.error}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-5"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : props.record ? 'Save changes' : `Create ${kind}`}</Button></div>
  </form>
}
