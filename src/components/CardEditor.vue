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
        class="form__button button form__button--confirm primary"
        icon="check"
        size="2x"
        @click="newCard ? addCard() : editCard()"
      ></font-awesome-icon>
    </div>
    <div v-if="newCard">
      <div class="form__top-label">
        Add card to deck: <strong class="form__top-label--strong">{{ selectedDeck.title }}</strong>
      </div>
      <span v-show="decks.length > 1" class="tag-selection">
        <span class="tag-selection__title">Change deck:</span>
        <span v-for="deck in decks" :key="deck._id" class="tag-selection__tag-span">
          <button
            v-show="deck._id !== selectedDeck._id"
            class="tag-selection__tag"
            @click="$emit('changeSelectedDeck', deck._id)"
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
          deckId: {
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
      type: Object,
      default() {
        return {
          cards: [],
          title: 'Default Deck',
          _id: '',
          deleted: false,
          ttl: 1596161096048,
        };
      },
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
      const payload = {
        card: {
          frontText: this.newFrontText,
          backText: this.newBackText,
          _id: uuid(),
          updatedAt: new Date().getTime(),
        },
        deckId: this.selectedDeck._id,
      };
      this.$emit('addCard', payload);
    },
    editCard: function() {
      const payload = {
        card: {
          frontText: this.newFrontText,
          backText: this.newBackText,
          _id: this.editPayload._id,
          updatedAt: new Date().getTime(),
        },
        deckId: this.editPayload.deckId,
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
