<template>
  <v-dialog :model-value="isOpen" @input="$emit('close')">
    <v-card>
      <v-card-title>Register</v-card-title>
      <v-card-text>
        <v-text-field label="Name" v-model="name" required />
        <v-text-field label="Email" v-model="email" required type="email" />
        <v-text-field label="Confirm Email" v-model="confirmEmail" required type="email" />
        <v-text-field label="Password" v-model="password" required type="password" />
      </v-card-text>
      <v-card-actions>
        <v-btn @click="submit">Register</v-btn>
        <v-btn text @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    isOpen: {
      type: Boolean,
    }
  },
  data() {
    return {
      name: '',
      email: '',
      confirmEmail: '',
      password: ''
    }
  },
  methods: {
      close() {
      this.$emit("update:isOpen", false);
    },
    async submit() {
      // Implement registration logic using PocketBase API call here
      console.log(
        'Register clicked! Name:',
        this.name,
        'Email:',
        this.email,
        'Password:',
        this.password
      )
    }
  }
}
</script>

<style scoped>
/* Add your styles for the modal layout */
</style>
