# @argus/api-zod

Auto-generated Zod validation schemas for all Argus API request bodies, path parameters, query parameters, and responses.

**Do not edit the files in `src/generated/` directly.** They are regenerated from `lib/api-spec/openapi.yaml` via Orval.

## Regenerating

```bash
pnpm --filter @argus/api-spec run codegen
```

## Usage

```ts
import { CreateTeamBody, GetTeamResponse } from "@argus/api-zod";

const parsed = CreateTeamBody.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: parsed.error.message });
}
```
