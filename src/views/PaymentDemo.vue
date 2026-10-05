<template>
  <div class="demo-wrap">
    <div class="glass-card">
      <h1>PayMongo Checkout Demo</h1>
      <p class="muted">
        This page exercises the full payment flow: checkout, redirect, return, webhook.
        Use test card <code>4343434343434345</code> with any future expiry and any CVC.
      </p>

      <div class="form-row">
        <label>Amount (₱)</label>
        <input v-model.number="amount" type="number" min="1" step="0.01" />
      </div>

      <div class="form-row">
        <label>Description</label>
        <input v-model="description" type="text" placeholder="Demo payment" />
      </div>

      <div class="form-row">
        <label>Mode</label>
        <div class="mode-picker">
          <label><input type="radio" value="checkout" v-model="mode" /> Hosted checkout</label>
          <label><input type="radio" value="source"   v-model="mode" /> Source (GCash/Maya)</label>
          <label><input type="radio" value="link"     v-model="mode" /> Payment link</label>
        </div>
      </div>

      <PaymentMethodSelector v-model="method" label="Payment method" class="selector" />

      <button
        class="primary"
        :disabled="busy || !amount || !method"
        @click="launch"
      >
        {{ busy ? 'Creating…' : 'Launch PayMongo checkout' }}
      </button>

      <div v-if="lastResult" class="result">
        <pre>{{ lastResult }}</pre>
      </div>
    </div>

    <!-- The modal -->
    <PayMongoCheckout
      ref="checkoutRef"
      :mode="mode"
      @created="onCreated"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PaymentMethodSelector from '@/components/common/PaymentMethodSelector.vue'
import PayMongoCheckout      from '@/components/common/PayMongoCheckout.vue'

const amount      = ref(100)
const description = ref('Demo payment')
const method      = ref(null)
const mode        = ref('checkout')  // checkout | source | link

const busy        = ref(false)
const checkoutRef = ref(null)
const lastResult  = ref(null)

async function launch() {
  busy.value = true
  lastResult.value = null
  try {
    checkoutRef.value?.open({
      supplier_id: 1,
      amount:      Number(amount.value),
      description: description.value,
      method:      method.value
    })
  } catch (e) {
    lastResult.value = { error: e?.message || String(e) }
  } finally {
    busy.value = false
  }
}

function onCreated(res) {
  lastResult.value = res
}

function onError(err) {
  lastResult.value = { error: err?.message || String(err) }
}
</script>

<style scoped>
.demo-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bg, #0f172a);
}

.glass-card {
  width: 100%;
  max-width: 560px;
  padding: 2rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
}

h1 { margin: 0 0 0.5rem; font-size: 1.35rem; }
.muted { color: rgba(241, 245, 249, 0.65); font-size: 0.85rem; margin: 0 0 1.5rem; }
.muted code { background: rgba(255,255,255,0.1); padding: 0.1rem 0.35rem; border-radius: 4px; }

.form-row { margin-bottom: 1rem; }
.form-row label {
  display: block; font-size: 0.8rem;
  color: rgba(241,245,249,0.7); margin-bottom: 0.35rem;
}
.form-row input[type="text"],
.form-row input[type="number"] {
  width: 100%; padding: 0.6rem 0.8rem;
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: #f1f5f9; outline: none;
}
.form-row input:focus { border-color: #6366f1; }

.mode-picker {
  display: flex; flex-direction: column; gap: 0.35rem;
  font-size: 0.85rem; color: rgba(241,245,249,0.8);
}
.mode-picker label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

.selector { margin: 0.5rem 0 1.5rem; }

button.primary {
  width: 100%; padding: 0.85rem;
  border-radius: 12px; border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-weight: 600; cursor: pointer;
  transition: filter 0.15s;
}
button.primary:hover:not(:disabled) { filter: brightness(1.1); }
button.primary:disabled { opacity: 0.5; cursor: not-allowed; }

.result {
  margin-top: 1.25rem;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  max-height: 240px;
  overflow: auto;
}
.result pre { margin: 0; color: #a5b4fc; white-space: pre-wrap; word-break: break-all; }
</style>