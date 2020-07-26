<template>
  <div>
    <div id="login-body">
      <b-alert
        :show="state.dismissCountDown"
        dismissible
        fade
        variant="warning"
        @dismiss-count-down="countDownChanged"
      >
        {{ state.apiErrorMsg }}
      </b-alert>
      <login-password
        @updatePassword="state.password = $event"
        @updateEmail="state.email = $event"
        @emailValidation="state.emailValidation = $event"
        @passwordValidation="state.passwordValidation = $event"
      ></login-password>
      <login-signup-buttons
        :email-validation="state.emailValidation"
        :password-validation="state.passwordValidation"
        :making-request="state.makingRequest"
        @login="loginOrSignup(false)"
        @signup="loginOrSignup(true)"
      ></login-signup-buttons>
      <login-google></login-google>
      <login-facebook></login-facebook>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive, watch } from '@vue/composition-api';
import { BAlert } from 'bootstrap-vue';
import LoginPassword from '../components/LoginPassword.vue';
import LoginSignupButtons from '../components/LoginSignupButtons.vue';
import LoginGoogle from '../components/LoginGoogle.vue';
import LoginFacebook from '../components/LoginFacebook.vue';

import store from '../store';
export default {
  name: 'Login',
  components: { LoginPassword, LoginSignupButtons, BAlert, LoginGoogle, LoginFacebook },
  setup() {
    const state = reactive({
      email: '' as string,
      password: '' as string,
      emailValidation: false as boolean,
      passwordValidation: false as boolean,

      apiErrorMsg: '' as string,
      failedLogin: false as boolean,
      dismissSecs: 5 as number,
      dismissCountDown: 0 as number,

      makingRequest: false as boolean,

      showSignup: false as boolean,
    });

    async function showAlert() {
      state.dismissCountDown = state.dismissSecs;
    }
    watch(
      () => state.failedLogin,
      newValue => {
        if (newValue === true) {
          showAlert();
        }
      }
    );
    const loginOrSignup = async function(signup: boolean) {
      state.makingRequest = true;
      state.failedLogin = false;
      const response = await store.dispatch.authMod.passwordAuth({
        password: state.password,
        username: state.email,
        signup,
      });
      if (response !== 'success') {
        state.makingRequest = false;
        state.failedLogin = true;
        state.apiErrorMsg = response;
      }
    };
    async function countDownChanged(dismissCountDown: number) {
      state.dismissCountDown = dismissCountDown;
    }

    return {
      state,
      loginOrSignup,
      countDownChanged,
    };
  },
};
</script>

<style scoped>
#login-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  max-width: 370px;
  overflow-y: auto;
}
</style>
