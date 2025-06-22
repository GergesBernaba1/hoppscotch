import { createPinia } from "pinia"
import { HoppModule } from "."

export default <HoppModule>{
  onVueAppInit(app) {
    const pinia = createPinia()
    app.use(pinia)
  }
} 