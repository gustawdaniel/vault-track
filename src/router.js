import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/account/:id',
      name: 'account',
      component: () => import(/* webpackChunkName: "SingleAccountTransactions" */ './views/SingleAccountTransactions'),
      props: true
    },
    {
      path: '/about',
      name: 'about',
      component: () => import(/* webpackChunkName: "About" */ './views/About')
    }
  ]
})


router.beforeResolve((to, from, next) => {
  // If this isn't an initial page load.
  if (to.name) {
    // Start the route progress bar.
    NProgress.start()
  }
  next()
})

router.afterEach((to, from) => {
  // Complete the animation of the route progress bar.
  NProgress.done()
})

export default router;
