import Vue from 'vue';
import VueRouter, { RouteConfig, Route, NavigationGuardNext } from 'vue-router';
import store from '../store';
import Login from '../views/Login.vue';
import Home from '../views/Home.vue';

Vue.use(VueRouter);

async function checkForOauthParams(to: Route, from: Route, next: NavigationGuardNext) {
  // console.log('checkForOauthParams: to', to);
  const tokenquery = to.query.token;
  let token = null;
  if (tokenquery) token = tokenquery.toString();
  if (token) {
    // console.log('token', token);
    await store.commit.authMod.JWT(token);
    const verified = await store.dispatch.authMod.verifyJwt();
    // console.log('verified', verified);
    if (verified) {
      next('/home');
    } else {
      next('/login');
    }
  } else next();
}

/**Less strict check*/
async function checkJwtExpired(to: Route, from: Route, next: NavigationGuardNext) {
  // console.log('jwt check expired to', to);
  if (await store.getters.authMod.jwtNotExpired) {
    next();
  } else {
    next('/login');
  }
}
/**More strict check */
async function checkJwtValid(to: any, from: any, next: any) {
  // console.log('jwt check valid to', to);
  const verified = await store.dispatch.authMod.verifyJwt();
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
    beforeEnter: checkJwtValid,
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: checkForOauthParams,
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    beforeEnter: checkJwtValid,
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
