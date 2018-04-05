import Accounts from '../components/Accounts.vue';
import HelloWorld from '../components/HelloWorld.vue';
import NewAccount from '../components/NewAccount.vue';

export default [
  // { path: "/", component: HelloWorld },
  { path: "/", component: Accounts },
  { path: "/new_account", component: NewAccount }
];
