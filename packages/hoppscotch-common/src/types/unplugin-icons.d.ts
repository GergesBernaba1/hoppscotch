/**
 * TypeScript declaration for unplugin-icons
 * This allows TypeScript to understand the icon imports (which are resolved at build time)
 */

declare module '~icons/*' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const component: FunctionalComponent<SVGAttributes>
  export default component
}
