# moneta

> Immutable, BigInt-precision monetary values for TypeScript. No float errors. Currency-safe by design.

[![CI](https://github.com/PuvaanRaaj/moneta/actions/workflows/ci.yml/badge.svg)](https://github.com/PuvaanRaaj/moneta/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/moneta)](https://www.npmjs.com/package/moneta)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/moneta)](https://bundlephobia.com/package/moneta)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Why moneta?

Every JavaScript app that handles money eventually hits the float trap:

```js
0.1 + 0.2 === 0.3 // false — 0.30000000000000004
```

`moneta` solves this permanently using **native BigInt** under the hood — no floats, ever.
It also catches **currency mismatches at the TypeScript type level**, not at runtime.

```ts
const usd = money('10.00', 'USD')
const eur = money('5.00',  'EUR')

usd.add(eur) // TypeError — caught at compile time, not in production
```

## Install

```bash
npm install moneta
```

Requires Node ≥ 18. Zero runtime dependencies.

## Quick start

```ts
import { money } from 'moneta'

const price = money('19.99', 'USD')
const tax   = money('1.60',  'USD')

price.add(tax).format('en-US')       // "$21.59"
price.multiply(1.1).format('en-US')  // "$21.99"
price.divide(3).format('en-US')      // "$6.66"

// Allocate $10 in 3 parts — sum always equals original
money('10.00', 'USD').allocate([1, 1, 1])
// [Money('3.34 USD'), Money('3.33 USD'), Money('3.33 USD')]
```

## API

### `money(amount, currency)`

The primary factory. Returns an immutable `Money<C>` instance.

```ts
money('19.99', 'USD')   // from string  — recommended
money(19.99, 'USD')     // from number  — uses toFixed() internally
money(1999n, 'USD')     // from bigint  — treated as minor units (cents)
```

### `Money.fromMinorUnits(units, currency)`

Create from raw minor units — useful when reading from a database.

```ts
Money.fromMinorUnits(1999n, 'USD') // $19.99
```

### Arithmetic

All operations return a **new** `Money` instance (immutable).

| Method | Description |
|---|---|
| `.add(other)` | Add two same-currency values |
| `.subtract(other)` | Subtract two same-currency values |
| `.multiply(factor)` | Multiply by a scalar (number or string) |
| `.divide(divisor)` | Divide by a scalar, half-up rounding |
| `.allocate(ratios)` | Proportional split — sum always exact |
| `.abs()` | Absolute value |
| `.negate()` | Flip sign |

### Comparison

```ts
a.equals(b)
a.greaterThan(b)
a.lessThan(b)
a.greaterThanOrEqual(b)
a.lessThanOrEqual(b)
a.isZero()
a.isPositive()
a.isNegative()
```

### Accessors

```ts
m.currency       // 'USD'
m.minorUnits     // 1999n  — safe for DB storage
m.decimalValue   // '19.99'
```

### Formatting

```ts
m.format()         // uses default locale
m.format('de-DE')  // "19,99 $"
m.format('ja-JP')  // "＄19.99"
```

### Serialisation

```ts
m.toJSON()
// { amount: '19.99', currency: 'USD', minorUnits: '1999' }

JSON.stringify(m)
// '{"amount":"19.99","currency":"USD","minorUnits":"1999"}'

m.toString()  // '19.99 USD'
```

## Supported currencies

34 ISO 4217 currencies included: AED, AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, JPY, KRW, KWD, MXN, MYR, NOK, NZD, PHP, PLN, RON, SAR, SEK, SGD, THB, TRY, TWD, USD, VND, ZAR.

## Error handling

All errors extend `MonetaError` and are typed:

```ts
import {
  CurrencyMismatchError,
  DivisionByZeroError,
  InvalidAmountError,
  UnknownCurrencyError,
} from 'moneta'
```

## Security

- Zero runtime dependencies
- No `eval`, no dynamic code execution
- No install scripts — safe against supply-chain attacks
- Every npm release is published with **provenance** (SLSA Level 2)

```bash
npm audit signatures  # verify the package wasn't tampered with
```

See [SECURITY.md](SECURITY.md) for the full policy and how to report vulnerabilities.

## License

[MIT](LICENSE)
