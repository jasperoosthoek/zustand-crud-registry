
##### Version 0.0.1
- Initial commit

##### Version 0.0.2
- Include key in `Config` type

##### Version 0.0.3
- Refactor imports names
- New `includeRecord` in config to output full `record` in hook

##### Version 0.0.4
- Fix type of optional `record` in `useCrud`

##### Version 0.0.5
- Fix possible `null` of optional `record` in `useCrud`

##### Version 0.0.6
- Fix `customActions` config losing their `route` field
- Change fieldname `onResponse`
- Make `PrepareOptions` no longer optional in type
- New `patchList` function on store

##### Version 0.0.7
- Export `CustomActionFunction` type

##### Version 0.0.8
- Remove `setList` from output of `useCrud` hook
- New `useStore` hook that returns all the store functions and data as reactive elements

##### Version 0.0.9
- Upgrade to React@19.1.0

##### Version 0.0.10
- Fix: not updating after `get` action when the state is empty

##### Version 0.0.11
- Updated peerDependencies to require React 19+
- Added CI/CD status badges to README
- New up test files and documentation

##### Version 0.0.12
- New `updateList` function in store

##### Version 0.0.13
- Move `/src/__tests__` to `/__tests__`
- Remove debug code that made api calls slow

##### Version 0.1.0
- All actions have optional `onResponse` function that handles `Axios` response data
- New `pagination` object in config that replaces `count`

##### Version 0.1.1
- Make all fields in `config.pagination` optional

##### Version 0.2.0
- Make subcribing to `pagination` optional
- Remove `useStore` hook which leads to unnecessary renders
- Action functions are now referentially stable with loading state properties mutated in place on each render.
- Prettify types and fix many broken compound types by replacing conditional with mapped types
- Allow `store.setList(null)` to clear list
- Select single and multiple instances implemented & new `useSelect` hook

##### Version 0.2.1
- Change internal storage element from `map` to `record` so `list` preserves original order as returned by api
- Make `list` opt-in with `config.includeList` setting

##### Version 0.2.2
- New `useGet(store, id?)` hook — subscribes to a single instance and auto-fetches on mount. Returns `[instance, get]` tuple
- New `useGetList(store)` hook — subscribes to list and auto-fetches on mount. Returns `[list, getList]` tuple
- Remove `useInstance` (replaced by `useGet`)
- `useCrud` no longer uses conditional hook calls internally
- `useCrud(store, id?)` accepts optional `id` — returns `instance: T | null` with auto-fetch via existing `get` action

##### Version 0.2.3
- Fix conditional fields on `useCrud` (`list`, `record`, `pagination`, `state`, `select`, `instance`) leaking through as accessible when not configured. They are now correctly absent — add the missing config key if needed (e.g. `includeList: true`).
- Replace lazy `any` casts in `useActions` with proper `ActionFunctions<T>` types
- Remove conditional `useMemo` hooks — hooks are now unconditional with conditional internals
- Deduplicate select logic in `useCrud` — delegates to `useSelectBase`
- New type probe files for config, action, and store type coverage

##### Upcoming
- Fix custom action loading guard and error state writing to `'custom'` key instead of the actual action name
- Fix hardcoded `data.id` / `response.id` — now uses `config.id` so custom id fields work for per-record loading indicators
- Rename config fields: `id` → `detailKey` (field used in detail routes), `byKey` → `id` (field used to key the internal Map, defaults to `detailKey`)
- Known limitation: when `id` differs from `detailKey`, `useCrud(store, value)` requires the `id` value for lookup — the auto-fetch then sends that value in the `detailKey` field position