<template>
  <div class="about">

    <pre>{{$store.state.operations.length}} operations</pre>

    <div style="display: flex">
      <pre>{{$store.state.accounts}}</pre>
      <pre>{{$store.state.operations}}</pre>
    </div>
  </div>
</template>

<script>
  export default {
    name: "About"
  }
</script>
