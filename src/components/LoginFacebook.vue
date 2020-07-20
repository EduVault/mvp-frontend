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
export default {
  created() {
    console.log(
      process.env.NODE_ENV,
      process.env.VUE_APP_DEV_API_URL + process.env.VUE_APP_FACEBOOK_AUTH
    );
  },
  methods: {
    openLink() {
      window.location =
        process.env.NODE_ENV === 'production'
          ? process.env.VUE_APP_API_URL + process.env.VUE_APP_FACEBOOK_AUTH
          : process.env.VUE_APP_DEV_API_URL + process.env.VUE_APP_FACEBOOK_AUTH;
    },
  },
};
</script>

<style></style>
