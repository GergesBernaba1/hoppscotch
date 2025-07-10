<template>
  <div class="smart-code-editor-placeholder">
    <textarea v-model="code" rows="10" cols="50" @input="updateValue(code)" />
  </div>
</template>

<script>
import { ref, watch } from "vue"

export default {
  name: "SmartCodeEditor",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "xml",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const code = ref(props.modelValue)

    // Watch for changes from parent
    watch(
      () => props.modelValue,
      (newVal) => {
        code.value = newVal
      }
    )

    // Watch for internal changes
    const updateValue = (newValue) => {
      emit("update:modelValue", newValue)
    }

    return {
      code,
      updateValue,
    }
  },
}
</script>

<style scoped>
.smart-code-editor-placeholder {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  background: #f9f9f9;
}
textarea {
  width: 100%;
  font-family: monospace;
  font-size: 1em;
}
</style>
