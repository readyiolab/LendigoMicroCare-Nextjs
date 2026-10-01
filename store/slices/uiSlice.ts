import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const getInitialSidebarState = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("sidebar_collapsed")
    return saved === "true"
  }
  return false
}

export interface UiState {
  isSidebarCollapsed: boolean
  isMobileMenuOpen: boolean
  isLoading: boolean
  loadingMessage: string
}

export const createInitialUiState = (): UiState => ({
  isSidebarCollapsed: getInitialSidebarState(),
  isMobileMenuOpen: false,
  isLoading: false,
  loadingMessage: "",
})

const uiSlice = createSlice({
  name: "ui",
  initialState: createInitialUiState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed
      localStorage.setItem("sidebar_collapsed", String(state.isSidebarCollapsed))
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload
      localStorage.setItem("sidebar_collapsed", String(action.payload))
    },
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },
    setIsMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileMenuOpen = action.payload
    },
    setGlobalLoading: (state, action: PayloadAction<boolean | { loading: boolean; message?: string }>) => {
      if (typeof action.payload === "boolean") {
        state.isLoading = action.payload
        state.loadingMessage = ""
      } else {
        state.isLoading = action.payload.loading
        state.loadingMessage = action.payload.message || ""
      }
    },
  },
})

export const { toggleSidebar, setSidebarCollapsed, toggleMobileMenu, setIsMobileMenuOpen, setGlobalLoading } =
  uiSlice.actions

export default uiSlice.reducer
