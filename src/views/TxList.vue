<template>
  <b-container>
    <h1 class="text-center mt-3">My on chain transactions</h1>
    <b-list-group>
      <b-list-group-item v-for="(txId, index) in txlist" :key="index">
        <a class="secondary" :href="'https://satoshi.io/tx/' + txId">{{ index + 1 }}</a>
      </b-list-group-item>
    </b-list-group>
  </b-container>
</template>

<script>
import { BListGroup, BListGroupItem, BContainer } from 'bootstrap-vue';
import store from '../store';
export default {
  components: { BListGroup, BListGroupItem, BContainer },
  mounted() {
    store.dispatch.decksMod.deckSavedTxIds().then(list => (this.txlist = list));
  },
  data() {
    return {
      txlist: [],
    };
  },
};
</script>

<style></style>
