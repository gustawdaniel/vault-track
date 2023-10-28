<script lang="ts" setup>
import type { AccountType } from '~/store/account';

const props = defineProps<{ type: AccountType }>();
</script>

<template>
  <img
    v-if="props.type === 'Invst'"
    alt="Invst"
    src="~/assets/icons/png/001-piggy-bank.png"
  />
  <img
    v-else-if="props.type === 'Bank'"
    alt="Bank"
    src="~/assets/icons/png/006-bank.png"
  />
  <img
    v-else-if="props.type === 'Cash'"
    alt="Cash"
    src="~/assets/icons/png/014-coins.png"
  />
  <img
    v-else-if="props.type === 'CCard'"
    alt="CCard"
    src="~/assets/icons/png/004-credit-card.png"
  />
  <img v-else alt="Unknown" src="~/assets/icons/png/005-gold-ingots.png" />
</template>

<style scoped></style>
