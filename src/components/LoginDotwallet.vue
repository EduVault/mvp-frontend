<template>
  <div class="login-component__body mb-1 ">
    <dotwallet-login
      :app-id="dotwalletAppId"
      :redirect-url="dotwalletRedirectUrl"
      @click="login()"
    ></dotwallet-login>
  </div>
</template>

<script>
import { DotwalletLogin } from 'dotwallet-vue'; //@ts-ignore
import { DOTWALLET_AUTH, API_URL_ROOT, DOTWALLET_APP_ID } from '@/config';
import ip from 'ip';
import store from '../store';
export default {
  components: { DotwalletLogin },
  created() {
    console.log(ip.address() + ':3000' + DOTWALLET_AUTH);
  },
  data() {
    return {
      dotwalletAppId: DOTWALLET_APP_ID,
      dotwalletRedirectUrl:
        process.env.NODE_ENV === 'production'
          ? 'https://' + API_URL_ROOT + DOTWALLET_AUTH
          : 'http://' + ip.address() + ':3000' + DOTWALLET_AUTH,
    };
  },
  methods: {
    login() {
      store.commit.authMod.AUTHTYPE('dotwallet');
    },
  },
};
</script>

<style></style>
