declare module "mobx-vue-lite" {
  import type { DefineComponent } from "vue";

  export const Observer: DefineComponent<Record<string, unknown>, Record<string, unknown>>;
}
