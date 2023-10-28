<script lang="ts" setup>
import pJson from '../package.json';
</script>

<template>
  <div>
    <pre>{{ pJson.name }}</pre>
    <pre>{{ pJson.version }}</pre>
  </div>
</template>

<style scoped></style>
