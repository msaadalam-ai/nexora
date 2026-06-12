function tauriInvoke() {
  return globalThis.__TAURI__?.core?.invoke
}

export const hardware = {
  isDesktop: () => Boolean(tauriInvoke()),
  async printReceipt(receipt) {
    const invoke = tauriInvoke()
    if (invoke) return invoke('print_receipt', { receipt })
    window.print()
    return { mode: 'browser' }
  },
  async openCashDrawer() {
    const invoke = tauriInvoke()
    if (!invoke) throw new Error('cash_drawer_requires_desktop')
    return invoke('open_cash_drawer')
  },
  async deviceStatus() {
    const invoke = tauriInvoke()
    if (!invoke) return { mode: 'web', printer: 'browser', cashDrawer: 'unavailable', scanner: 'keyboard-wedge' }
    return invoke('device_status')
  },
}
