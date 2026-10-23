<script setup lang="ts">
import type { TripColorKey, TripIconKey } from '@7trip/shared';
import { tripColors, tripIconPaths } from '@7trip/ui-tokens';

const props = withDefaults(defineProps<{ color: TripColorKey; icon: TripIconKey; size?: number }>(), { size: 56 });
</script>

<template>
  <div class="tile" :style="{ background: tripColors[props.color], width: `${props.size}px`, height: `${props.size}px` }">
    <svg :width="props.size / 2" :height="props.size / 2" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path :d="tripIconPaths[props.icon]" />
    </svg>
  </div>
</template>

<style scoped>
.tile { border-radius: 16px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
</style>
