import qif2json from 'qif2json';
import { formatYMD } from '../helpers/date';

onmessage = async m => {
  console.log("IN WORKER", m)

  postMessage({type: 'START'});
  postMessage({type: 'SET', value: 0});

  const text = await m.data.text();
  console.log(text);

  qif2json.parseInput(text, {}, (err, data) => {
    if(err) {
      postMessage({type: 'ERROR', value: err})
    } else {
      const max = data.accounts.length + data.transactions.length;
      let index = 0;

      console.log(data);
      data.accounts.forEach(a => {
        postMessage({type:'ACCOUNT/ADD', value: a});
        index++;
        postMessage({type: 'SET', value: index/max});
      })
      data.transactions.forEach(t => {
        t.date = formatYMD(t.date);
        postMessage({name: 'TRANSACTION/ADD', value: t});
        index++;
        postMessage({type: 'SET', value: index/max});
      })

      postMessage({type: 'DONE'});
    }
  })





  // let index = 0
  // console.log("A");
  // postMessage({type: 'START'});
  // postMessage({type: 'SET', value: 0});
  //
  // console.log("B");
  // const interval = setInterval(() => {
  //
  //   postMessage({type: 'SET', value: (index++)/100});
  //   console.log("SET", index);
  //   if(index > 100) {
  //     postMessage({type: 'DONE'});
  //
  //     clearInterval(interval);
  //   }
  //
  // }, 100);


}
