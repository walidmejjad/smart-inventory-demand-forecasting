import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/catalog/catalog-ui'
import { useCatalogForm } from '@/hooks/use-catalog-form'
import { fieldAria, normalizePrice, optionalText } from '@/lib/catalog'
import type { Category, Product, ProductInput, Supplier } from '@/types/catalog'

export function ProductForm({ product, categories, suppliers, busy, onSave, onCancel }: { product: Product | null; categories: Category[]; suppliers: Supplier[]; busy: boolean; onSave: (input: ProductInput) => Promise<void>; onCancel: () => void }) {
  const form = useCatalogForm({
    name: product?.name ?? '', sku: product?.sku ?? '', description: product?.description ?? '', price: product?.price ?? '',
    quantity_in_stock: String(product?.quantity_in_stock ?? 0), reorder_level: String(product?.reorder_level ?? 0),
    category_id: product ? String(product.category_id) : '', supplier_id: product ? String(product.supplier_id) : '',
  }, (values) => {
    const errors: Partial<Record<keyof typeof values, string>> = {}
    if (!values.name.trim() || values.name.trim().length > 255) errors.name = 'Enter a name of 1–255 characters.'
    if (!values.sku.trim() || values.sku.trim().length > 100) errors.sku = 'Enter a SKU of 1–100 characters.'
    const cleanPrice = values.price.trim().replace(/^0+(?=\d)/, '')
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(cleanPrice)) errors.price = 'Enter a nonnegative price with up to 10 integer digits and 2 decimal places.'
    for (const key of ['quantity_in_stock', 'reorder_level'] as const) {
      if (!/^\d+$/.test(values[key]) || !Number.isSafeInteger(Number(values[key]))) errors[key] = 'Enter a nonnegative whole number.'
    }
    if (!categories.some((item) => item.id === Number(values.category_id))) errors.category_id = 'Choose an available category.'
    if (!suppliers.some((item) => item.id === Number(values.supplier_id))) errors.supplier_id = 'Choose an available supplier.'
    return errors
  }, async (values) => onSave({ name: values.name.trim(), sku: values.sku.trim(), description: optionalText(values.description), price: normalizePrice(values.price.trim()), quantity_in_stock: Number(values.quantity_in_stock), reorder_level: Number(values.reorder_level), category_id: Number(values.category_id), supplier_id: Number(values.supplier_id) }))
  const { errors, bind } = form
  return <form noValidate onSubmit={form.submit} className="space-y-5" aria-busy={busy}>
    <fieldset disabled={busy} className="space-y-5">
      <Field name="product-name" label="Product name" error={errors.name}><input id="product-name" className="catalog-input" required maxLength={255} placeholder="Product name" {...bind('name')} {...fieldAria('product-name', errors.name)} /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="product-sku" label="SKU" error={errors.sku}><input id="product-sku" className="catalog-input" required maxLength={100} placeholder="Unique SKU" {...bind('sku')} {...fieldAria('product-sku', errors.sku)} /></Field><Field name="product-price" label="Price" error={errors.price}><input id="product-price" className="catalog-input" inputMode="decimal" required placeholder="0.00" {...bind('price')} {...fieldAria('product-price', errors.price)} /></Field></div>
      <Field name="product-description" label="Description (optional)"><textarea id="product-description" className="catalog-input min-h-20 resize-y" placeholder="A brief product description" {...bind('description')} /></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="product-stock" label="Quantity in stock" error={errors.quantity_in_stock}><input id="product-stock" className="catalog-input" inputMode="numeric" required {...bind('quantity_in_stock')} {...fieldAria('product-stock', errors.quantity_in_stock)} /></Field><Field name="product-reorder" label="Reorder level" error={errors.reorder_level}><input id="product-reorder" className="catalog-input" inputMode="numeric" required {...bind('reorder_level')} {...fieldAria('product-reorder', errors.reorder_level)} /></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="product-category" label="Category" error={errors.category_id}><select id="product-category" className="catalog-input" required {...bind('category_id')} {...fieldAria('product-category', errors.category_id)}><option value="">Choose a category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field name="product-supplier" label="Supplier" error={errors.supplier_id}><select id="product-supplier" className="catalog-input" required {...bind('supplier_id')} {...fieldAria('product-supplier', errors.supplier_id)}><option value="">Choose a supplier</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
    </fieldset>
    {(!categories.length || !suppliers.length) && <p className="text-xs leading-5 text-muted-foreground">A category and supplier are required. Manage <Link className="underline underline-offset-2" to="/categories">categories</Link> or <Link className="underline underline-offset-2" to="/suppliers">suppliers</Link> first, then refresh this page.</p>}
    {form.error && <p role="alert" className="text-xs leading-5 text-destructive">{form.error}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-5"><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || !categories.length || !suppliers.length}>{busy ? 'Saving…' : product ? 'Save changes' : 'Create product'}</Button></div>
  </form>
}
