import { configureStore, type Middleware, type Action } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { hmsApi } from './services/hms-api'
import isLoggedInSlice from './slices/is-logged-in-slice'
import { logout } from './slices/is-logged-in-slice'

const resetApiOnLogoutMiddleware: Middleware = ({ dispatch }) => (next) => (action) => {
    const result = next(action)

    if ((action as Action).type === logout.type) {
        dispatch(hmsApi.util.resetApiState())
    }

    return result
}

export const store = configureStore({
    reducer: {
        [hmsApi.reducerPath]: hmsApi.reducer,
        isLoggedIn: isLoggedInSlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
        }).concat(hmsApi.middleware, resetApiOnLogoutMiddleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
