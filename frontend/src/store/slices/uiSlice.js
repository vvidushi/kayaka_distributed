import { createSlice } from '@reduxjs/toolkit';

const allowedThemes = ['light', 'cupcake', 'dark'];

const getInitialTheme = () => {
  if (typeof localStorage === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  return allowedThemes.includes(saved) ? saved : 'light';
};

const initialState = {
  theme: getInitialTheme(),
  sidebarOpen: false,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      const nextTheme = allowedThemes.includes(action.payload)
        ? action.payload
        : 'light';
      state.theme = nextTheme;
      localStorage.setItem('theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;
export default uiSlice.reducer;
