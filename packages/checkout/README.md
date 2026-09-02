# Checkout

The host-agnostic WordPress.com checkout: the UI and logic that render identically inside any
checkout host — a Calypso modal, a Dashboard modal, or the legacy full-page `/checkout` route.

The package is being filled in incrementally.

## Host context

Everything irreducibly host-specific enters through one injected React context. A host builds a
`CheckoutHostContext` — the site being bought for, how to navigate, how to close, how to show a
notice, the URL parameters, how to record an event, and what to do when the purchase completes —
and mounts it:

```tsx
import { CheckoutHostProvider, useCheckoutHost } from '@automattic/checkout';

<CheckoutHostProvider value={ host }>{ checkout }</CheckoutHostProvider>;
```

Components read it with `useCheckoutHost()`, which throws when no host is mounted: a checkout with
nowhere to navigate and no way to close cannot recover. `useOptionalCheckoutHost()` returns `null`
instead, for call sites that still have a legacy fallback during the migration.

Site _facts_ — atomic, jetpack, private — are not part of the context. They are derived from
`siteId` through the shared site queries, so there is one source of truth for site data. Genuinely
global concerns (feature flags, analytics transport, i18n) stay global.

## Import boundary

Nothing in this package may import from the legacy Calypso app (`calypso/*`, `client/*`) or from
Redux (`redux`, `react-redux`, `redux-thunk`). Host-specific behavior enters through a typed host
context supplied by the embedding app, and server data is read through `@automattic/api-queries`.

The boundary is enforced by `.eslintrc.js` — `no-restricted-imports`, `no-restricted-modules`, and
a `no-restricted-syntax` selector for `import()` — so a forbidden import fails `yarn lint:js` in
CI. `src/__tests__/import-boundary.ts` asserts the rules still bite.

## Seams

### `host/` — what an app gives the checkout

`CheckoutHostContext` and its provider: which site is being bought for, how to
navigate, how to close, how to show a notice, and what to do when the purchase
completes. One host fills this in; the checkout reads it.

### `content/` — what the checkout tells its host

`CheckoutStatusProvider` and `useCheckoutStatus` carry `isBusy` and `canClose`
outwards, so a host can decide whether its frame may be dismissed. Only the
checkout can see that a payment is going through; only the host can act on it.
A host that renders no provider is told nothing, which is what the full-page
route does.

### `state/` — what a shopper has typed

The contact-details model and its updaters, the checkout store, and
`CheckoutStoreProvider`, which registers one store per open checkout so two of
them never share a form.

The package hands out `createCheckoutStore()` and registers nothing itself.
This package declares `sideEffects: false`, so a `register()` running at module
scope in here would be unsafe twice over: a bundler is free to drop the module
holding it, and if it survives, whether it has run by the time anything reads
the store depends on import order. Registering the one global store is the
app's job.

### `order/` — following a purchase to its end

`useOrderTransaction` polls an order until the server says what happened to it.
