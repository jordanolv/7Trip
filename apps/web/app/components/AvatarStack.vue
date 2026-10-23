<script setup lang="ts">
const props = defineProps<{ names: string[]; total: number }>();
const TINTS = ['#F3D2BC', '#E4E6F7', '#C9DCEF', '#CFE3D7', '#F1CFDE'];
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();
const shown = computed(() => props.names.slice(0, 3));
</script>

<template>
  <div class="stack" aria-hidden="true">
    <span v-for="(name, index) in shown" :key="index" class="avatar" :style="{ background: TINTS[index % TINTS.length] }">{{ initials(name) }}</span>
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
