<template>
  <div class="app u-scroller">
    <TheNavbar></TheNavbar>
    <AlertUpdatePWA></AlertUpdatePWA>

    <router-view class="app_router-view" />
  </div>
</template>
<script>
import AlertUpdatePWA from './components/AlertUpdatePWA.vue';
import TheNavbar from './components/TheNavbar.vue';
export default {
  components: { AlertUpdatePWA, TheNavbar },
};
</script>
<style lang="scss">
@import './styles/_variables.scss';
// Blocks should only be concerned with internal positioning like (eg. padding).
// Position of the whole block (eg. margin) should rely on parent (.app__nav nav)
</style>
