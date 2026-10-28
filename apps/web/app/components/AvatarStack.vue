<script setup lang="ts">
import { avatarColors, type AvatarColorKey } from '@7trip/ui-tokens';

/** `colors`: each person's avatar colour, when known; otherwise a tint per position. */
const props = defineProps<{ names: string[]; colors?: AvatarColorKey[]; total: number }>();
const FALLBACK: AvatarColorKey[] = ['peach', 'periwinkle', 'sky', 'sage', 'rose'];
const tint = (index: number) => avatarColors[props.colors?.[index] ?? FALLBACK[index % FALLBACK.length]!];
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();
const shown = computed(() => props.names.slice(0, 3));
</script>

<template>
  <div class="stack" aria-hidden="true">
    <span v-for="(name, index) in shown" :key="index" class="avatar" :style="{ background: tint(index).bg, color: tint(index).ink }">{{ initials(name) }}</span>
    <span v-if="props.total > shown.length" class="avatar more">+{{ props.total - shown.length }}</span>
  </div>
</template>

<style scoped>
.stack { display: flex; }
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  border: 2px solid var(--surface);
  margin-left: -8px;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar:first-child { margin-left: 0; }
.more { background: var(--chip); }
</style>
