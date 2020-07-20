<template>
  <div class="top-button-div">
    <h2 class="mr-3">Deck</h2>
    <font-awesome-icon
      class="button"
      color="rgb(46, 204, 113)"
      icon="plus-square"
      size="2x"
      @click="$emit('newDeck')"
    ></font-awesome-icon>
  </div>
</template>

<script>
export default {};
</script>
