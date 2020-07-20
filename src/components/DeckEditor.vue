<template>
  <div class="editor">
    <p class="form__top-label">Title</p>
    <input v-model="newTitle" class="form__text-input" type="text" />
    <div class="form__button-row">
      <font-awesome-icon
        class="form__button button form__button--cancel"
        icon="times"
        size="2x"
        @click="$emit('closeDeckEditor')"
      ></font-awesome-icon>
      <font-awesome-icon
        class="form__button button form__button--confirm"
        color="rgb(46, 204, 113)"
        icon="check"
        size="2x"
        @click="newTitle !== '' ? createDeck() : null"
      ></font-awesome-icon>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Deck, Card } from '@/types';
export default Vue.extend({
  data() {
    return {
      newTitle: '' as string,
    };
  },
  methods: {
    createDeck: function() {
      const newDeck = {
        cards: [] as Card[],
        title: this.newTitle,
      } as Deck;
      this.$emit('createDeck', newDeck);
      this.newTitle = '';
    },
  },
});
</script>

<style scoped>
.deck-input {
  margin: auto;
  text-align: center;
}
</style>
