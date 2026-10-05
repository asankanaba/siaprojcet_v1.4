<template>
  <Teleport to="body">
    <div v-if="visible" class="pmc-backdrop" @click.self="onBackdropClick">
      <div class="pmc-modal">

        <!-- ═══════════ HEADER ═══════════ -->
        <header class="pmc-head">
          <h3>{{ title }}</h3>
          <button class="pmc-close" :disabled="busy" @click="close">×</button>
        </header>

        <!-- ═══════════ BODY ═══════════ -->
        <div class="pmc-body">

          <!-- Summary -->
          <div class="pmc-summary">
            <div class="pmc-row">
              <span>Amount</span>
              <strong>₱{{ formatMoney(form.amount) }}</strong>
            </div>
            <div class="pmc-row" v-if="form.description">
              <span>For</span>
              <span class="pmc-trunc">{{ form.description }}</span>
            </div>
            <div class="pmc-row" v-if="form.po_id">
              <span>PO ID</span><span>#{{ form.po_id }}</span>
            </div>
            <div class="pmc-row" v-if="form.invoice_id">
              <span>Invoice ID</span><span>#{{ form.invoice_id }}</span>
            </div>
          </div>

          <!-- Method selector -->
          <PaymentMethodSelector
            v-model="form.method"
            label="Choose payment method"
            :disabled="busy"
          />

          <!-- Optional customer info -->
          <details class="pmc-optional" v-if="!compact">
            <summary>Add customer info (optional)</summary>
            <div class="pmc-fields">
              <input v-model="form.customer_name"  placeholder="Customer name"  :disabled="busy" />
              <input v-model="form.customer_email" placeholder="Customer email" type="email" :disabled="busy" />
              <input v-model="form.customer_phone" placeholder="Customer phone" type="tel" :disabled="busy" />
            </div>
          </details>

          <!-- Notes -->
          <textarea
            v-model="form.notes"
            placeholder="Notes (optional)"
            rows="2"
            :disabled="busy"
            class="pmc-notes"
          ></textarea>

          <!-- ═══════════ RESULT PANEL ═══════════ -->
          <!-- ⬇️ PATCH: added <details> block for debugging backend errors -->
          <div v-if="result" class="pmc-result" :class="resultKind">

            <!-- Link mode: show copy-able URL -->
            <div v-if="resultKind === 'link'">
              <p class="pmc-result-title">Payment link ready</p>
              <div class="pmc-link-row">
                <input :value="result.link_url" readonly class="pmc-link-input" />
                <button class="pmc-copy" @click="copy(result.link_url)">Copy</button>
              </div>
              <p class="pmc-result-hint">
                Share this link with your customer/supplier. Payment status updates automatically.
              </p>
            </div>

            <!-- Redirect mode: spinner bar -->
            <div v-else-if="resultKind === 'redirect'">
              <p class="pmc-result-title">Redirecting to PayMongo…</p>
              <div class="pmc-bar"><div class="pmc-bar-fill"></div></div>
            </div>

            <!-- Error: show message + expandable debug details -->
            <div v-else-if="resultKind === 'error'">
              <p class="pmc-result-title">Payment failed</p>
              <p class="pmc-result-hint">{{ errorMessage }}</p>

              <!-- ⬇️ NEW: debug details for troubleshooting -->
              <details v-if="errorDebug" class="pmc-debug">
                <summary>Show server details</summary>
                <pre>{{ errorDebug }}</pre>
              </details>
            </div>

          </div>
        </div>

        <!-- ═══════════ FOOTER ═══════════ -->
        <footer class="pmc-foot">
          <button class="pmc-btn pmc-btn-ghost" :disabled="busy" @click="close">
            Cancel
          </button>

          <button
            v-if="mode === 'link'"
            class="pmc-btn pmc-btn-primary"
            :disabled="busy || !form.method"
            @click="start"
          >
            {{ busy ? 'Working…' : 'Create link' }}
          </button>

          <button
            v-else
            class="pmc-btn pmc-btn-primary"
            :disabled="busy || !form.method"
            @click="start"
          >
            {{ busy ? 'Working…' : `Pay ₱${formatMoney(form.amount)}` }}
          </button>
        </footer>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { usePaymentsStore } from '@/stores/payments'
import PaymentMethodSelector from './PaymentMethodSelector.vue'

const props = defineProps({
  mode:         { type: String,  default: 'checkout' },   // checkout | source | link
  redirectBase: { type: String,  default: null },
  compact:      { type: Boolean, default: false },
  autoOpen:     { type: Boolean, default: false },
  preset:       { type: Object,  default: () => ({}) }
})
const emit = defineEmits(['opened', 'created', 'error', 'closed'])

const store = usePaymentsStore()

// ---------- Local state ----------
const visible      = ref(false)
const busy         = ref(false)
const errorMessage = ref(null)
const errorDebug   = ref(null)   // ⬅️ NEW: raw payload for debugging
const result       = ref(null)   // { kind, link_url, checkout_url, ... }

// ---------- Form ----------
const form = reactive({
  supplier_id:    1,
  amount:         0,
  description:    '',
  notes:          '',
  method:         null,
  po_id:          null,
  invoice_id:     null,
  customer_name:  '',
  customer_email: '',
  customer_phone: '',
  ...props.preset
})

const title = computed(() => {
  if (props.mode === 'link')   return 'Create payment link'
  if (props.mode === 'source') return 'Choose payment method'
  return 'Complete payment'
})

const resultKind = computed(() => {
  if (!result.value) return null
  if (result.value.kind === 'link')     return 'link'
  if (result.value.kind === 'redirect') return 'redirect'
  return 'error'
})

// ---------- Public API ----------
function open(presets = {}) {
  Object.assign(form, presets)
  visible.value = true
  result.value = null
  errorMessage.value = null
  errorDebug.value = null
  emit('opened')
}

function close() {
  if (busy.value) return
  visible.value = false
  emit('closed')
}

function onBackdropClick() {
  if (!busy.value && !result.value) close()
}

// ---------- Start the payment ----------
async function start() {
  busy.value = true
  errorMessage.value = null
  errorDebug.value = null
  result.value = null

  const redirect_base = props.redirectBase || `${window.location.origin}`

  try {
    let res

    // ---- Link mode ----
    if (props.mode === 'link') {
      res = await store.createLink({
        supplier_id: form.supplier_id,
        amount:      Number(form.amount),
        description: form.description || undefined,
        po_id:       form.po_id || undefined,
        invoice_id:  form.invoice_id || undefined,
        notes:       form.notes || undefined
      })
      result.value = { kind: 'link', link_url: res.link_url, payment_ref: res.payment_ref }
      emit('created', res)
      return
    }

    // ---- Source mode (GCash/Maya/GrabPay/QR Ph legacy flow) ----
    if (props.mode === 'source') {
      res = await store.createSource({
        supplier_id:    form.supplier_id,
        amount:         Number(form.amount),
        method:         form.method,
        description:    form.description || undefined,
        po_id:          form.po_id || undefined,
        invoice_id:     form.invoice_id || undefined,
        customer_name:  form.customer_name || undefined,
        customer_email: form.customer_email || undefined,
        customer_phone: form.customer_phone || undefined,
        notes:          form.notes || undefined,
        redirect_base
      })
      emit('created', res)
      result.value = { kind: 'redirect' }
      setTimeout(() => { window.location.href = res.checkout_url }, 400)
      return
    }

    // ---- Default: hosted Checkout Session ----
    res = await store.createCheckout({
      supplier_id:    form.supplier_id,
      amount:         Number(form.amount),
      description:    form.description || undefined,
      methods:        form.method ? [form.method] : undefined,
      po_id:          form.po_id || undefined,
      invoice_id:     form.invoice_id || undefined,
      customer_name:  form.customer_name || undefined,
      customer_email: form.customer_email || undefined,
      customer_phone: form.customer_phone || undefined,
      notes:          form.notes || undefined,
      redirect_base
    })
    emit('created', res)
    result.value = { kind: 'redirect' }
    setTimeout(() => { window.location.href = res.checkout_url }, 400)

  } catch (e) {
    // ⬇️ PATCH: capture full error payload for the debug <details> block
    errorMessage.value = e?.message || 'Payment failed'
    errorDebug.value = JSON.stringify(
      e?.response?.data || e?.payload || { message: e?.message },
      null,
      2
    )
    result.value = { kind: 'error' }
    emit('error', e)
  } finally {
    busy.value = false
  }
}

// ---------- Helpers ----------
function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text) } catch (e) { /* ignore */ }
}

defineExpose({ open, close })

if (props.autoOpen) visible.value = true
</script>

<style scoped>
.pmc-backdrop {
  position: fixed; inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem; z-index: 9999;
  animation: fade 0.15s ease;
}
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.pmc-modal {
  width: 100%; max-width: 520px; max-height: 90vh;
  overflow: hidden; display: flex; flex-direction: column;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
  color: #f1f5f9;
  animation: pop 0.2s ease;
}
@keyframes pop { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }

.pmc-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.pmc-head h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.pmc-close { background: transparent; border: none; color: rgba(241, 245, 249, 0.6); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 0.25rem; }
.pmc-close:hover { color: #f1f5f9; }

.pmc-body { padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem; }

.pmc-summary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex; flex-direction: column; gap: 0.4rem;
}
.pmc-row { display: flex; justify-content: space-between; font-size: 0.85rem; gap: 1rem; }
.pmc-row span:first-child { color: rgba(241, 245, 249, 0.55); }
.pmc-trunc { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pmc-optional summary { cursor: pointer; font-size: 0.8rem; color: rgba(165, 180, 252, 0.9); list-style: none; }
.pmc-optional summary::before { content: '▸ '; }
.pmc-optional[open] summary::before { content: '▾ '; }
.pmc-fields { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.6rem; }

.pmc-fields input,
.pmc-notes {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.pmc-fields input:focus,
.pmc-notes:focus { border-color: #6366f1; }

.pmc-result { border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.85rem; border: 1px solid transparent; }
.pmc-result.link     { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
.pmc-result.redirect { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); }
.pmc-result.error    { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.35); }

.pmc-result-title { font-weight: 600; margin: 0 0 0.5rem; }
.pmc-result-hint  { margin: 0.5rem 0 0; color: rgba(241, 245, 249, 0.65); font-size: 0.8rem; }

/* ⬇️ NEW: debug details block styling */
.pmc-debug { margin-top: 0.75rem; font-size: 0.75rem; }
.pmc-debug summary { cursor: pointer; color: rgba(165, 180, 252, 0.9); user-select: none; }
.pmc-debug pre {
  margin: 0.5rem 0 0;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: #fca5a5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
  line-height: 1.4;
}

.pmc-link-row { display: flex; gap: 0.5rem; }
.pmc-link-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #a5b4fc;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: ui-monospace, monospace;
}
.pmc-copy {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 8px;
  padding: 0 0.9rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.pmc-bar { height: 4px; background: rgba(34, 197, 94, 0.15); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
.pmc-bar-fill { width: 40%; height: 100%; background: #22c55e; animation: slide 1.2s ease-in-out infinite; }
@keyframes slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }

.pmc-foot {
  display: flex; gap: 0.75rem; justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pmc-btn { padding: 0.7rem 1.4rem; border-radius: 12px; font-weight: 500; font-size: 0.9rem; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
.pmc-btn-ghost { background: transparent; color: rgba(241, 245, 249, 0.75); border-color: rgba(255, 255, 255, 0.15); }
.pmc-btn-ghost:hover { background: rgba(255, 255, 255, 0.05); }
.pmc-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.pmc-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.pmc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>