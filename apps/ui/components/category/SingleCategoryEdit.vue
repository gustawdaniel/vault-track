<script lang="ts" setup>
import ExtendableListEditForm from '../expandableList/ExtendableListEditForm.vue';
import type { PersistedCategory } from '~/store/category';

defineProps<{ category: PersistedCategory }>();
</script>

<template>
  <ExtendableListEditForm :init-value="category" resource="category" />
</template>
