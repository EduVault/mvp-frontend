<template>
  <div class="home">
    <section class="home__section editing-section">
      <new-deck-button @newDeck="state.showDeckEditor = true"></new-deck-button>
      <new-card-button
        @newCard="
          state.newCard = true;
          state.showCardEditor = true;
        "
      ></new-card-button>
      <deck-editor
        v-if="state.showDeckEditor"
        class="editing-section__deck-input"
        @createDeck="createDeck"
        @closeDeckEditor="state.showDeckEditor = false"
      ></deck-editor>
    </section>
    <section class="home__section display-section">
      <deck-display
        v-for="deck in decks"
        :key="deck.title"
        class="display-section__deck-display"
        :deck="deck"
        @deleteCard="deleteCard"
        @openCardEditor="openCardEditor"
      ></deck-display>
    </section>
    <card-editor
      v-if="state.showCardEditor"
      class="display-section__card-editor"
      :decks="decks"
      :selected-deck="state.selectedDeck"
      :new-card="state.newCard"
      :edit-payload="state.editPayload"
      @closeEditor="
        state.showCardEditor = false;
        state.newCard = false;
      "
      @addCard="addNewCard"
      @editCard="editCard"
      @changeSelectedDeck="changeSelectedDeck"
    ></card-editor>
  </div>
</template>

<script lang="ts">
import { reactive, computed } from '@vue/composition-api';

import { Deck, DeleteCardPayload, EditCardPayload } from '@/types';

import store from '../store';

import CardEditor from '@/components/CardEditor.vue';
import DeckEditor from '@/components/DeckEditor.vue';
import DeckDisplay from '@/components/DeckDisplay.vue';
import NewCardButton from '@/components/NewCardButton.vue';
import NewDeckButton from '@/components/NewDeckButton.vue';

export default {
  name: 'ComposVuexPersist',
  components: { DeckDisplay, DeckEditor, CardEditor, NewCardButton, NewDeckButton },
  setup() {
    const decks = computed(() => {
      return store.getters.decksMod.decks;
    });
    const emptyPayload = {
      frontText: '',
      backText: '',
      deckTitle: '',
      _id: '',
    };
    const state = reactive({
      selectedDeck: decks ? (decks.value[0].title as string) : ('' as string),
      showCardEditor: false as boolean,
      showDeckEditor: false as boolean,
      editPayload: emptyPayload as EditCardPayload,
      newCard: false as boolean,
    });

    const createDeck = (deck: Deck) => {
      store.commit.decksMod.addDeck(deck);
      state.selectedDeck = deck.title;
      state.showDeckEditor = false;
    };
    const addNewCard = (payload: EditCardPayload) => {
      store.commit.decksMod.addCard(payload);
      state.showCardEditor = false;
      state.newCard = false;
    };
    const editCard = (payload: EditCardPayload) => {
      store.commit.decksMod.editCard(payload);
      state.showCardEditor = false;
      state.newCard = false;
    };
    const deleteCard = (payload: DeleteCardPayload) => {
      store.commit.decksMod.deleteCard(payload);
    };
    const changeSelectedDeck = (title: string) => {
      state.selectedDeck = title;
    };
    const openCardEditor = (payload: EditCardPayload) => {
      if (!state.newCard) state.editPayload = payload;
      else state.editPayload = emptyPayload;
      state.showCardEditor = true;
    };

    return {
      decks,
      state,
      createDeck,
      addNewCard,
      emptyPayload,
      editCard,
      deleteCard,
      changeSelectedDeck,
      openCardEditor,
    };
  },
};
</script>
