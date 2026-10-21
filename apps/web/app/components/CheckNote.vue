<template>
  <p class="note">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22553F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
    <span><slot /></span>
  </p>
</template>

<style scoped>
.note { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--ink-tertiary); line-height: 1.45; margin: 0; }
svg { flex: 0 0 auto; margin-top: 1px; }
</style>
