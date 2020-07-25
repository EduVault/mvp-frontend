import Vue from 'vue';
import VueRouter, { RouteConfig, Route, NavigationGuardNext } from 'vue-router';
import store from '../store';
import Login from '../views/Login.vue';
import Home from '../views/Home.vue';

Vue.use(VueRouter);

/**More strict check */
async function checkAuthValid(to: any, from: any, next: any) {
  // console.log('jwt check valid to', to);
  const verified = await store.dispatch.authMod.checkAuth();
  // console.log('verified', verified);
  if (verified) {
    next();
  } else {
    next('/login');
  }
}

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Root',
    redirect: '/home',
    beforeEnter: checkAuthValid,
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
    beforeEnter: checkAuthValid,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

const waitForStorageToBeReady = async (to: any, from: any, next: () => void) => {
  // undocumented bug in vuex-persist with localforage. Hacky fix from issues forum
  await ((store as unknown) as { restored: Promise<unknown> }).restored;
  next();
};
router.beforeEach(waitForStorageToBeReady);

export default router;
