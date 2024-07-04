<template>
  <div class="landing-page">
    <header></header>

    <main>
      <section></section>
      <section></section>
      <section></section>
    </main>

    <section class="cta">
      <button @click="$router.push('/login')">Login/Register</button>
    </section>

    <footer></footer>
  </div>
</template>

<script>
export default {
  name: 'LandingPage'
}
</script>

<style scoped>
.landing-page {
  /* Add your styles for the landing page layout */
}
</style>
