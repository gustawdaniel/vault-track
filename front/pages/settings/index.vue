<template>
  <div class="container">
    <div class="mx-3">
      <h1 class="font-bold">{{ $t('settings.main') }}</h1>
      <hr>
      <ul>
        <li class="p-1 border-b cursor-pointer" @click="openLanguageDialog">
          <p>{{ $t('settings.default-lang') }}</p>
          <p class="text-sm text-gray-700">{{ $t(`settings.${$i18n.locale}`) }}</p>
        </li>
        <li class="p-1 border-b bg-gray-200 text-gray-600">
          <p>{{ $t('settings.default-currency') }}</p>
          <p class="text-sm text-gray-700">{{ $t('settings.default-currency-sentence', {currency: 'PLN'}) }}</p>
        </li>
        <li class="p-1 border-b h-12 flex items-center bg-gray-200 text-gray-600">
          <p>{{ $t('pages.categories') }}</p>
        </li>
        <li class="p-1 border-b h-12 flex items-center bg-gray-200 text-gray-600">
          <p>{{ $t('pages.projects') }}</p>
        </li>
        <nuxt-link to="/cloud">
          <li class="p-1 border-b cursor-pointer">
            <p>{{ $t('settings.cloud-title') }}</p>
            <p class="text-sm text-gray-700">{{ $t('settings.cloud-description') }}</p>
          </li>
        </nuxt-link>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: "index",
  methods: {
    openLanguageDialog() {
      this.$router.push(this.switchLocalePath(this.$i18n.locale === 'pl' ? 'en' : 'pl'))
    }
  }
}
</script>

<style scoped>

</style>
