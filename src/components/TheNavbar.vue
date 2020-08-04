<template>
  <b-navbar ref="navbarMain" toggleable="xs" type="dark" variant="secondary">
    <b-navbar-toggle v-if="loggedIn" target="nav-collapse" />

    <font-awesome-layers v-if="loggedIn" class="nav-icon__layers fa-lg ">
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
    <b-link v-if="$router.currentRoute.name == 'Login'" class="nav__link" to="/home">Home</b-link>
    <b-link v-else-if="loggedIn" to="/login" @click="logout()" class="nav__link">Logout</b-link>
    <b-link v-else class="nav__link" to="/login">Login</b-link>
    <b-collapse v-if="loggedIn" id="nav-collapse" is-nav>
      <b-navbar-nav>
        <b-nav-text>View my data on the IPFS</b-nav-text>
        <b-link
          class="ml-2"
          v-for="(deck, index) in decksList.list"
          :key="index"
          @click="viewDeck(deck)"
          >deck: {{ index + 1 }}</b-link
        >
        <b-link class="mt-3" @click="newTabLink(bucketLink)"
          >View my files on the IPFS</b-link
        ></b-navbar-nav
      >
    </b-collapse>
  </b-navbar>
</template>
<script lang="ts">
import {
  BLink,
  BNavbar,
  BNavbarNav,
  // BNavForm,
  // BFormInput,
  BNavbarToggle,
  BNavText,
  // BNavItem,
  BCollapse,
} from 'bootstrap-vue';
import { computed, reactive } from '@vue/composition-api';
import store from '../store';
import axios from 'axios';
// import router from '../router';
export default {
  name: 'Navbar',
  components: {
    BLink,
    BNavbar,
    BNavbarNav,
    // BNavForm,
    // BFormInput,
    BNavbarToggle,
    BNavText,
    // BNavItem,
    BCollapse,
  },
  setup() {
    const bucketLink = store.state.authMod.bucketUrl;
    const threadView = `https://${store.state.authMod.threadIDStr}.thread.hub.textile.io/Deck/`;
    const decksList = reactive({
      list: [] as any,
    });
    axios.get(threadView).then(res => {
      res.data.forEach((deck: any) => {
        decksList.list.push(deck._id);
      });
      console.log(decksList);
    });
    const newTabLink = (link: string) => {
      window.open(link, '_blank');
    };
    const viewDeck = (deckID: string) => {
      window.open(threadView + deckID);
    };
    const loggedIn = computed(() => store.getters.authMod.loggedIn);
    const syncing = computed(() => store.getters.authMod.syncing);
    const logout = () => {
      store.dispatch.authMod.logout();
      store.commit.authMod.LOGGEDIN(false);
    };

    return { loggedIn, syncing, logout, newTabLink, threadView, decksList, bucketLink, viewDeck };
  },
};
</script>
<style lang="scss" scoped>
#nav-icon__sync {
  margin: 4px 0px 0px 9px;
}
// .app__nav {
//   display: flex;
//   justify-content: space-between;
//   padding: 10px 25px;
//   text-align: center;
//   width: 100%;
//   background-color: $secondary;

//   &__link {
//     font-weight: bold;
//     color: white;
//     padding: 5px 10px;

//     &.router-link-exact-active {
//       color: $primary;
//     }
//   }
// }
</style>
