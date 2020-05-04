<template>
    <div>
    <input type="file" @change="upload" :disabled="loading">
<p>Time: {{time}} ms</p>
<p>Mean: {{Math.round(meanTime*100)/100}} ms</p>
    </div>
</template>

<script>

  // import qif2json from 'qif2json';
  import qif2json from '../../local/qif2json/index';
  import { formatYMD } from '../helpers/date';
  // import simpleWorker from 'worker-loader!../workers/import-qif.worker'
  NProgress.configure({minimum: 0.01});

  export default {
    name: 'ImportQIF',
    data() {
      return {
        loading: false,
        time: 0,
        meanTime: 0
      }
    },
    methods: {
        async upload(e) {
          console.log('e', e);

          const start = new Date();

          let file = e.target.files[0];

          NProgress.start();
          NProgress.set(0);

          let reader = new FileReader()

          const getText = () => new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
          });

          reader.readAsText(file, 'utf-8');

          const text = await getText()

          console.log(text);

          qif2json.parseInput(text, {encoding: 'utf-8'}, async (err, data) => {
            if(err) {
              NProgress.done();
              console.error(err);
            } else {
              const accountsLength = data.accounts.length;
              const transactionsLength = data.transactions.length;
              const max = accountsLength + transactionsLength;

              console.log(data.transactions[0].date);

              await this.$store.dispatch('LOAD_QIF', data);

              NProgress.done();

              this.time = new Date() - start;
              this.meanTime = ( new Date() - start ) / max;

            }
          })

        }
    }
  };
</script>

<style scoped>

</style>


<!--async uploadWorker(e) {-->

<!--NProgress.configure({ minimum: 0 });-->

<!--let s = simpleWorker();-->

<!--s.onmessage = res => {-->
<!--console.log("ANSWER", res)-->

<!--switch (res.data.type) {-->
<!--case 'START':-->
<!--NProgress.start();-->
<!--this.loading = true;-->
<!--break;-->
<!--case 'SET':-->
<!--NProgress.set(res.data.value);-->
<!--break;-->
<!--case 'DONE':-->
<!--NProgress.done();-->
<!--this.loading = false;-->
<!--break;-->
<!--case 'TRANSACTION/ADD':-->
<!--this.$store.dispatch('TRANSACTION/ADD', res.data.value);-->
<!--break;-->
<!--case 'ACCOUNT/ADD':-->
<!--this.$store.dispatch('ACCOUNT/ADD', res.data.value);-->
<!--break;-->
<!--case 'ERROR':-->
<!--NProgress.done();-->
<!--this.loading = false;-->
<!--console.error(res.data.value);-->
<!--}-->

<!--}-->

<!--const file = e.target.files[0];-->
<!--console.log(file);-->

<!--s.postMessage(file);-->
<!--}-->
