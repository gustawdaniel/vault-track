<template>
  <el-cascader
          placeholder="Try searchingL Guide"
          :options="options"
          size="small"
          style="width: 100%"
          clearable
          filterable></el-cascader>
</template>

<script>
  export default {
    name: 'CategoryInput',
    data() {
      return {
        options: [
          {
            value: 'guide',
            label: 'Guide',
            children: [
              {
                value: 'disciplines',
                label: 'Disciplines',
              },
            ],
          },
        ],
      };
    },
  };
</script>

<style scoped>

</style>
