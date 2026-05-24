# @argus/api-client-react

Auto-generated TanStack Query hooks for all Argus API endpoints, built from `lib/api-spec/openapi.yaml`.

**Do not edit files in `src/generated/` directly.**

## Regenerating

```bash
pnpm --filter @argus/api-spec run codegen
```

## Usage

```tsx
import { useListTeams, useCreateTeam } from "@argus/api-client-react";

function TeamsPage() {
  const { data: teams } = useListTeams();
  // ...
}
```

## Configuration

Set the API base URL for non-browser environments (e.g. Expo):

```ts
import { setBaseUrl } from "@argus/api-client-react";
setBaseUrl("https://api.example.com");
```
