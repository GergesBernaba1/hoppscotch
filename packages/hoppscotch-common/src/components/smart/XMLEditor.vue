<template>
  <div class="flex flex-col flex-1 h-full">
    <textarea
      ref="editor"
      class="w-full flex-1 p-4 font-mono text-sm bg-transparent outline-none resize-none"
      spellcheck="false"
      @input="updateContent"
      :value="modelValue"
      :placeholder="placeholder"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, onMounted, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  }
});

const emit = defineEmits(["update:modelValue"]);
const editor = ref<HTMLTextAreaElement | null>(null);

const updateContent = (event: Event) => {
  const content = (event.target as HTMLTextAreaElement).value;
  emit("update:modelValue", content);
};

// Sync editor content with model value
watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value && editor.value.value !== newVal) {
      editor.value.value = newVal;
    }
  }
);

// Setup editor on mount
onMounted(() => {
  if (editor.value) {
    editor.value.value = props.modelValue;
  }
});
</script>

<script lang="ts">
export default {
  name: "SmartXMLEditor"
}
</script>

<style scoped>
/* Add any additional styling here */
</style>
