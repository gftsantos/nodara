# @nodara/vue

Vue 3 components powered by `@nodara/core`.

```vue
<script setup lang="ts">
import { NodaraGantt } from "@nodara/vue";
import "@nodara/core/styles.css";
</script>

<template>
  <NodaraGantt :data="tasks" zoom="month" @task-select="openTask" />
</template>
```
