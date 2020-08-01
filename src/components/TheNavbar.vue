<template>
  <div class="app__nav">
    <router-link class="nav__link" to="/home">Home</router-link>
    <font-awesome-layers class="nav-icon__layers fa-lg ">
      <font-awesome-icon class="nav-icon__cloud fa-lg primary " icon="cloud" />
      <font-awesome-icon
        id="nav-icon__sync"
        class=" fa-xs secondary "
        :spin="syncing"
        icon="sync"
      />
      <!-- <font-awesome-icon
        v-else-if="syncFailed || !online"
        id="exclamation"
        style="color: primary;"
        class="fa-xs"
        icon="exclamation"
      /> -->
      <!-- <font-awesome-icon v-else id="checkmark" style="color: primary;" class="fa-xs" icon="check" /> -->
    </font-awesome-layers>
    <div v-if="loggedIn" @click="logout()">
      <router-link to="/login" class="nav__link">Logout</router-link>
    </div>

    <router-link v-else class="nav__link" to="/login">Login</router-link>
  </div>
</template>
<script lang="ts">
import { computed } from '@vue/composition-api';
import store from '../store';

export default {
  name: 'Navbar',
  setup() {
    const loggedIn = computed(() => store.getters.authMod.loggedIn);
    const syncing = computed(() => store.getters.authMod.syncing);
    const logout = () => {
      store.dispatch.authMod.logout();
      store.commit.authMod.LOGGEDIN(false);
    };

    return { loggedIn, syncing, logout };
  },
};
</script>
<style lang="scss" scoped>
#nav-icon__sync {
  margin: 4px 0px 0px 9px;
}
</style>
