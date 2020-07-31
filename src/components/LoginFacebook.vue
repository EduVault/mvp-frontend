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
import { API_URL, DEV_API_URL, FACEBOOK_AUTH } from '../config';
export default {
  methods: {
    openLink() {
      window.location =
        process.env.NODE_ENV === 'production'
          ? API_URL + FACEBOOK_AUTH
          : DEV_API_URL + FACEBOOK_AUTH;
    },
  },
};
</script>

<style></style>
