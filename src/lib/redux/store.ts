
import { configureStore } from "@reduxjs/toolkit";

import documentsReducer from "./slices/documentsSlice";
import chatReducer from "./slices/chatSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      documents: documentsReducer,
      chat: chatReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;

export type RootState = ReturnType<
  AppStore["getState"]
>;

export type AppDispatch = AppStore["dispatch"];
