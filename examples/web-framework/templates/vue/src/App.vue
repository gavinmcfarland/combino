<template>
  <div class="app">
    <h1>Welcome to <%= name %></h1>
    <p><%= description %></p>
  </div>
</template>

<script lang="<%= language %>">
export default {
  name: 'App'
}
</script>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
}
</style>
