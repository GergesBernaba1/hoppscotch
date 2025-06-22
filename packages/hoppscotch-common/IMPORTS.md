# Import Guidelines for Hoppscotch

This document outlines the recommended import patterns to maintain consistent code across the Hoppscotch codebase.

## Defined Path Aliases

The following aliases are configured in the `tsconfig.json` file:

- `~/` → `./src/`
- `@composables/` → `./src/composables/`
- `@components/` → `./src/components/`
- `@helpers/` → `./src/helpers/`
- `@modules/` → `./src/modules/`
- `@workers/` → `./src/workers/`
- `@functional/` → `./src/helpers/functional/`

## Icon Imports

Icons are automatically imported using unplugin-icons with the following syntax:

```typescript
import IconName from "~icons/{collection}/{icon-name}"
```

Example:
```typescript
import IconCheck from "~icons/lucide/check"
```

## Recommended Import Patterns

### For Local Imports

1. **Nearby files (same directory or parent/child):**
   - Use relative imports
   ```typescript
   import { MyComponent } from "./MyComponent.vue"
   import { ParentComponent } from "../ParentComponent.vue"
   ```

2. **Distant files within the same package:**
   - Use path aliases when possible
   ```typescript
   // Instead of multiple levels of relative paths like "../../../services/persistence/service"
   import { PersistenceService } from "~/services/persistence/service"
   ```

### For Package Imports

1. **External packages:**
   - Use direct imports
   ```typescript
   import { ref, computed } from "vue"
   import { clone } from "lodash-es"
   ```

2. **Workspace packages:**
   - Use package imports
   ```typescript
   import { HoppRESTRequest } from "@hoppscotch/data"
   ```

## Discouraged Patterns

1. **Don't use unregistered aliases**
   - ❌ `import { Service } from "@services/my-service"` (not registered in tsconfig.json)
   - ✅ `import { Service } from "~/services/my-service"`

2. **Don't use excessively deep relative paths**
   - ❌ `import { Something } from "../../../../utils/something"`
   - ✅ `import { Something } from "~/utils/something"`

3. **Be consistent with slash usage**
   - Use a trailing slash in aliases that represent directories
   - ❌ `import { util } from "~utils/something"`
   - ✅ `import { util } from "~/utils/something"`

## TypeScript Path Resolution

Note that these import patterns are resolved differently:
- During development: By Vite using its alias configuration
- During type checking: By TypeScript using the paths in tsconfig.json

Make sure both configurations stay in sync.
