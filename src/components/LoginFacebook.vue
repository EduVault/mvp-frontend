<template>
  <div class="login-component__body mb-1 ">
    <img
      class="oauth-login-button"
      src="@/assets/facebook-button.png"
      alt="google login"
      width="250px"
      @click="openLink"
    />
  </div>
</template>

<script>
import { API_URL_ROOT, DEV_API_URL_ROOT, FACEBOOK_AUTH } from '../config';
export default {
  methods: {
    openLink() {
      window.location =
        process.env.NODE_ENV === 'production'
          ? API_URL_ROOT + FACEBOOK_AUTH
          : DEV_API_URL_ROOT + FACEBOOK_AUTH;
    },
  },
};
</script>

<style></style>
