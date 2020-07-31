<template>
  <div class="app u-scroller">
    <div class="app__nav">
      <router-link class="nav__link" to="/home">Home</router-link>
      <div v-if="loggedIn" @click="logout()">
        <router-link to="/login" class="nav__link">Logout</router-link>
      </div>

      <router-link v-else class="nav__link" to="/login">Login</router-link>
    </div>
    <AlertUpdatePWA></AlertUpdatePWA>

    <router-view class="app_router-view" />
  </div>
</template>
<script>
import store from './store';
import AlertUpdatePWA from './components/AlertUpdatePWA.vue';
export default {
  components: { AlertUpdatePWA },
  data() {
    return {
      loggedIn: false,
    };
  },
  mounted() {
    this.loggedIn = store.state.authMod.loggedIn;
  },
  methods: {
    logout() {
      this.loggedIn = false;
      store.dispatch.authMod.logout();
      store.commit.authMod.LOGGEDIN(false);
    },
  },
};
</script>
<style lang="scss">
@import './styles/_variables.scss';
// Blocks should only be concerned with internal positioning like (eg. padding).
// Position of the whole block (eg. margin) should rely on parent (.app__nav nav)
.app__nav {
  display: flex;
  justify-content: space-between;
  padding: 5px 25px;
  text-align: center;
  width: 100%;
  background-color: $secondary;
  &__link {
    font-weight: bold;
    color: white;
    padding: 5px 10px;
    &.router-link-exact-active {
      color: $primary;
    }
  }
}
</style>
