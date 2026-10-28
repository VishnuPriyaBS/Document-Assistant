"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Provider } from "react-redux";

import {
  makeStore,
} from "@/lib/redux/store";
import { attachChatPersistence } from "@/lib/chat/chatPersistence";

export default function StoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [{ store, serverState }] = useState(() => {
    const store = makeStore();

    return {
      store,
      serverState: store.getState(),
    };
  }); const [storageWarning, setStorageWarning] = useState("");

  useEffect(() => {
    return attachChatPersistence(store, setStorageWarning);
  }, [store]);

  return (
    <Provider store={store} serverState={serverState}>
      {storageWarning && (
        <div
          role="alert"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          {storageWarning}
        </div>
      )}

      {children}
    </Provider>
  );
}