import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
    value: boolean;
    meLoaded: boolean;
    apiLoaded: boolean
}

const hasStoredAccessToken = () =>
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem("access_token"));

const initialState: AuthState = {
    value: hasStoredAccessToken(),
    meLoaded: false,
    apiLoaded: false
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        loginSuccess: (state) => {
            state.value = true;
            state.meLoaded = false;
        },

        logout: (state) => {
            state.value = false;
            state.meLoaded = false;
            // state.apiLoaded = false;
            localStorage.clear();
        },

        setMeLoaded: (state) => {
            state.meLoaded = true;
        },

        setApiLoaded: (state, action: PayloadAction<boolean>) => {
            state.apiLoaded = action.payload
        },

        setLoggedInFromStorage: (state, action: PayloadAction<boolean>) => {
            state.value = action.payload;
        },
    },
});

export const {
    loginSuccess,
    logout,
    setMeLoaded,
    setLoggedInFromStorage,
    setApiLoaded
} = authSlice.actions;

export default authSlice.reducer;
