import Vue from 'vue';
import VueRouter, { RouteConfig, Route, NavigationGuardNext } from 'vue-router';
import store from '../store';
import Login from '../views/Login.vue';
import Home from '../views/Home.vue';
Vue.use(VueRouter);

/**undocumented bug in vuex-persist with localforage. Hacky fix from issues forum */
async function reHydrateStorage(to: Route, from: Route, next: any) {
  // undocumented bug in vuex-persist with localforage. Hacky fix from issues forum
  // restored is a promise, when fulfilled means state is restored
  await (store as any).original.restored;
  await (store as any).restored;
  next();
}

/**More strict check */
async function checkAuthValid(to: Route, from: Route, next: any) {
  if (to.query.checkauth === 'no' && to.path.includes('login')) {
    next();
  }
  const verified = await store.dispatch.authMod.checkAuth();
  if (verified && to.path.includes('login')) {
    next('/home');
  } else if (verified) {
    next();
  } else {
    next('/login/?checkauth=no');
  }
}

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Root',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: '/',
  routes,
});

router.beforeEach(async (to: Route, from: Route, next: any) => {
  await reHydrateStorage(to, from, next);
  await checkAuthValid(to, from, next);
});
export default router;
