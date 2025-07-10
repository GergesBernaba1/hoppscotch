import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import Collections from "../Collections.vue"

// Mock the services and composables
vi.mock("../../../composables/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock("dioc/vue", () => ({
  default: () => ({
    createNewTab: vi.fn().mockReturnValue({ id: "test-tab-id" }),
    setActiveTab: vi.fn(),
    tabs: { value: [] },
  }),
}))

vi.mock("../../../newstore/SOAPCollection", () => ({
  useSOAPCollectionStore: () => ({
    collections: [],
    createCollection: vi.fn().mockReturnValue({ id: "test-collection" }),
    addRequest: vi.fn(),
    importCollection: vi.fn(),
    deleteCollection: vi.fn(),
  }),
}))

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe("SOAP Collections", () => {
  it("renders the collections component", () => {
    const wrapper = mount(Collections)
    expect(wrapper.find(".flex.flex-col.flex-1").exists()).toBe(true)
  })

  it("renders empty state when no collections", () => {
    const wrapper = mount(Collections)
    expect(wrapper.find(".text-secondaryLight").text()).toContain(
      "No collections found"
    )
  })
})
