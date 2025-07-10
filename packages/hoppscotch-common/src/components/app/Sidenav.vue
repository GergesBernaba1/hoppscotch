<template>
  <aside class="flex h-full justify-between md:flex-col">
    <nav class="flex flex-1 flex-nowrap bg-primary md:flex-none md:flex-col">
      <HoppSmartLink
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        v-tippy="{
          theme: 'tooltip',
          placement: mdAndLarger ? 'right' : 'bottom',
          content: !EXPAND_NAVIGATION ? t(navigation.title) : null,
        }"
        :to="navigation.target"
        class="nav-link"
        tabindex="0"
        :exact="navigation.exact"
      >
        <div v-if="navigation.svg">
          <component :is="navigation.svg" class="svg-icons" />
        </div>
        <span v-if="EXPAND_NAVIGATION" class="nav-title">
          {{ t(navigation.title) }}
        </span>
      </HoppSmartLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
// Replace these imports with valid local icon components or SVGs
import IconSoap from "~/components/icon/IconSoap.vue"

// Dummy icon components for demonstration (replace with your own SVG/icon components)
const IconLink2 = {
  template:
    '<svg width="24" height="24"><rect width="24" height="24" fill="#ccc"/></svg>',
}
const IconGraphql = {
  template:
    '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#e10098"/></svg>',
}
const IconGlobe = {
  template:
    '<svg width="24" height="24"><ellipse cx="12" cy="12" rx="10" ry="8" fill="#4caf50"/></svg>',
}
const IconSettings = {
  template:
    '<svg width="24" height="24"><polygon points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8" fill="#607d8b"/></svg>',
}

// Dummy composable replacements (replace with your actual logic)
const t = (key: string) => key
const EXPAND_NAVIGATION = true
const mdAndLarger = true

const primaryNavigation = [
  {
    target: "/",
    svg: IconLink2,
    title: "REST",
    exact: true,
  },
  {
    target: "/graphql",
    svg: IconGraphql,
    title: "GraphQL",
    exact: false,
  },
  {
    target: "/soap",
    svg: IconSoap,
    title: "SOAP",
    exact: false,
  },
  {
    target: "/realtime",
    svg: IconGlobe,
    title: "Realtime",
    exact: false,
  },
  {
    target: "/settings",
    svg: IconSettings,
    title: "Settings",
    exact: false,
  },
]
</script>

<style scoped>
.nav-link {
  position: relative;
  padding: 1rem;
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s,
    color 0.2s;
  cursor: pointer;
}
.nav-link:hover {
  background: #23272f; /* fallback for bg-primaryDark */
  color: #1a202c; /* fallback for text-secondaryDark */
}
.nav-link:focus-visible {
  color: #1a202c; /* fallback for text-secondaryDark */
}
.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: transparent;
  z-index: 10;
}
.svg-icons {
  opacity: 0.75;
}
.nav-title {
  margin-top: 0.5rem;
  font-size: 0.75rem;
}
.nav-link.router-link-active,
.nav-link.exact-active-link {
  color: #1a202c; /* fallback for text-secondaryDark */
  background: #f3f4f6; /* fallback for bg-primaryLight */
}
.nav-link.router-link-active .svg-icons,
.nav-link.exact-active-link .svg-icons {
  opacity: 1;
}
.nav-link.router-link-active::after,
.nav-link.exact-active-link::after {
  background: #ff4081; /* fallback for bg-accent */
}
</style>
