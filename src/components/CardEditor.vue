<template>
  <div class="editor">
    <p class="form__top-label">Front</p>
    <input v-model="newFrontText" name="card-front-input" class="form__text-input" type="text" />
    <p class="form__top-label">Back</p>
    <input v-model="newBackText" name="card-back-input" class="form__text-input" type="text" />
    <div class="form__button-row">
      <font-awesome-icon
        class="form__button button form__button--cancel"
        icon="times"
        size="2x"
        @click="$emit('closeEditor')"
      ></font-awesome-icon>
      <font-awesome-icon
        class="form__button button form__button--confirm"
        color="rgb(46, 204, 113)"
        icon="check"
        size="2x"
        @click="newCard ? addCard() : editCard()"
      ></font-awesome-icon>
    </div>
    <div v-if="newCard">
      <div class="form__top-label">
        Add card to deck: <strong class="form__top-label--strong">{{ selectedDeck }}</strong>
      </div>
      <span v-show="decks.length > 1" class="tag-selection">
        <span class="tag-selection__title">Change deck:</span>
        <span v-for="deck in decks" :key="deck.title" class="tag-selection__tag-span">
          <button
            v-show="deck.title !== selectedDeck"
            class="tag-selection__tag"
            @click="$emit('changeSelectedDeck', deck.title)"
          >
            {{ deck.title }}
          </button>
        </span>
      </span>
    </div>
  </div>
</template>

<script>
import { v4 as uuid } from 'uuid';

export default {
  props: {
    editPayload: {
      type: Object,
      default: function() {
        return {
          deckTitle: {
            type: String,
            default: '',
          },
          frontText: {
            type: String,
            default: '',
          },
          backText: {
            type: String,
            default: '',
          },
          _id: {
            type: String,
            default: '',
          },
        };
      },
    },
    selectedDeck: {
      type: String,
      default: 'Default Deck',
    },
    decks: {
      type: Array,
      default() {
        return [];
      },
    },
    newCard: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      newFrontText: '',
      newBackText: '',
    };
  },
  created() {
    this.setFields();
  },
  methods: {
    setFields: function() {
      if (!this.newCard) {
        this.newFrontText = JSON.parse(JSON.stringify(this.editPayload.frontText));
        this.newBackText = JSON.parse(JSON.stringify(this.editPayload.backText));
      }
    },
    addCard: function() {
      const card = {
        frontText: this.newFrontText,
        backText: this.newBackText,
        _id: uuid(),
        deckTitle: this.selectedDeck,
      };
      this.$emit('addCard', card);
    },
    editCard: function() {
      const payload = {
        frontText: this.newFrontText,
        backText: this.newBackText,
        _id: this.editPayload._id,
        deckTitle: this.editPayload.deckTitle,
      };
      this.$emit('editCard', payload);
    },
  },
};
</script>

<style scoped>
.tag-selection__tag {
  color: white;
  background: grey;
  border: none;
  border-radius: 7px;
  margin: 5px;
  padding: 0.35rem;
  cursor: pointer;
  font-weight: bold;
}
</style>
