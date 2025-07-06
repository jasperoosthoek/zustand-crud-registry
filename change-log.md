
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