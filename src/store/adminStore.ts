import { createAdminRootStore, type TAdminRootStore } from "@growing/mst-models";

import { createAdminGqlHttpClient } from "./adminGqlClient";

let adminStore: TAdminRootStore | null = null;

export function getAdminStore(): TAdminRootStore {
  if (!adminStore) {
    adminStore = createAdminRootStore(createAdminGqlHttpClient());
  }
  return adminStore;
}
