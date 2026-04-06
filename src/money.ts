import { CURRENCIES, type CurrencyCode } from './currencies.js'
import {
  CurrencyMismatchError,
  DivisionByZeroError,
  InvalidAmountError,
  UnknownCurrencyError,
} from './errors.js'

// ─── Internal helpers ────────────────────────────────────────────────────────

const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/

/**
 * Parse a decimal string or number into a BigInt in minor units.
 * "19.99" with decimals=2  →  1999n
 * "-5.5"  with decimals=2  →  -550n
 */
function parseToMinorUnits(input: string | number | bigint, decimals: number): bigint {
  if (typeof input === 'bigint') return input

  const str = typeof input === 'number' ? input.toFixed(decimals) : input.trim()

  if (!AMOUNT_PATTERN.test(str)) {
    throw new InvalidAmountError(str)
  }

  const negative = str.startsWith('-')
  const abs = negative ? str.slice(1) : str
  const dotIdx = abs.indexOf('.')

  let whole: string
  let fraction: string

  if (dotIdx === -1) {
    whole = abs
    fraction = '0'.repeat(decimals)
  } else {
    whole = abs.slice(0, dotIdx)
    fraction = abs.slice(dotIdx + 1).padEnd(decimals, '0').slice(0, decimals)
  }

  const scale = 10n ** BigInt(decimals)
  const result = BigInt(whole) * scale + BigInt(fraction)
  return negative ? -result : result
}

/**
 * Convert minor units back to a decimal string for re-parsing.
 * 1999n with decimals=2  →  "19.99"
 */
function minorUnitsToString(units: bigint, decimals: number): string {
  const negative = units < 0n
  const abs = negative ? -units : units
  const scale = 10n ** BigInt(decimals)
  const whole = abs / scale
  const fraction = abs % scale
  const fractionStr = decimals > 0 ? `.${fraction.toString().padStart(decimals, '0')}` : ''
  return `${negative ? '-' : ''}${whole}${fractionStr}`
}

/**
 * Half-up rounding division for BigInt: round(numerator / denominator).
 */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new DivisionByZeroError()
  const absN = numerator < 0n ? -numerator : numerator
  const absD = denominator < 0n ? -denominator : denominator
  const rounded = (absN + absD / 2n) / absD
  const negative = (numerator < 0n) !== (denominator < 0n)
  return negative ? -rounded : rounded
}

/**
 * Parse a scalar factor string into (factorBig, precision) where
 * the true factor = factorBig / precision.
 */
function parseScalar(input: number | string): { factorBig: bigint; precision: bigint } {
  const f = typeof input === 'number' ? input.toString() : input.trim()
  if (!AMOUNT_PATTERN.test(f)) throw new InvalidAmountError(f)
  const negative = f.startsWith('-')
  const abs = negative ? f.slice(1) : f
  const dotIdx = abs.indexOf('.')
  const fracLen = dotIdx === -1 ? 0 : abs.length - dotIdx - 1
  const precision = 10n ** BigInt(fracLen)
  const parts = abs.split('.')
  const whole = parts[0] ?? ''
  const frac = parts[1] ?? ''
  const unsigned = BigInt(whole) * precision + BigInt(frac.padEnd(fracLen, '0'))
  return { factorBig: negative ? -unsigned : unsigned, precision }
}

// ─── Money class ─────────────────────────────────────────────────────────────

/**
 * Immutable, BigInt-precision monetary value.
 *
 * The generic parameter `C` brands the currency at the type level so
 * cross-currency arithmetic is a **compile-time error**.
 *
 * @example
 * const price = money('19.99', 'USD')
 * const tax   = money('1.60',  'USD')
 * price.add(tax).format()       // "$21.59"
 * price.add(money('5', 'EUR'))  // TypeError: currency mismatch
 */
export class Money<C extends CurrencyCode = CurrencyCode> {
  readonly #minorUnits: bigint
  readonly #currency: C
  readonly #decimals: number

  constructor(amount: string | number | bigint, currency: C) {
    if (!(currency in CURRENCIES)) {
      throw new UnknownCurrencyError(String(currency))
    }
    this.#currency = currency
    this.#decimals = CURRENCIES[currency].decimals
    this.#minorUnits = parseToMinorUnits(amount, this.#decimals)
  }

  // ─── Static factories ──────────────────────────────────────────────────────

  /** Create from raw minor units (e.g. cents). Useful when reading from a database. */
  static fromMinorUnits<C extends CurrencyCode>(units: bigint, currency: C): Money<C> {
    const decimals = CURRENCIES[currency].decimals
    return new Money<C>(minorUnitsToString(units, decimals), currency)
  }

  // ─── Accessors ─────────────────────────────────────────────────────────────

  /** Raw amount in minor units (e.g. cents). Safe for storage and wire transfer. */
  get minorUnits(): bigint {
    return this.#minorUnits
  }

  get currency(): C {
    return this.#currency
  }

  /** Human-readable decimal string, e.g. "19.99". */
  get decimalValue(): string {
    return minorUnitsToString(this.#minorUnits, this.#decimals)
  }

  // ─── Arithmetic ────────────────────────────────────────────────────────────

  add(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    return this.#fromUnits(this.#minorUnits + other.#minorUnits)
  }

  subtract(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    return this.#fromUnits(this.#minorUnits - other.#minorUnits)
  }

  /**
   * Multiply by a scalar. Uses half-up rounding to the currency's minor unit.
   * @example money('10.00', 'USD').multiply(1.1)  // $11.00
   * @example money('10.00', 'USD').multiply('1.5') // $15.00
   */
  multiply(factor: number | string): Money<C> {
    const { factorBig, precision } = parseScalar(factor)
    return this.#fromUnits(roundDiv(this.#minorUnits * factorBig, precision))
  }

  /**
   * Divide by a scalar. Uses half-up rounding to the currency's minor unit.
   * @example money('10.00', 'USD').divide(3)  // $3.33
   */
  divide(divisor: number | string): Money<C> {
    const { factorBig, precision } = parseScalar(divisor)
    if (factorBig === 0n) throw new DivisionByZeroError()
    return this.#fromUnits(roundDiv(this.#minorUnits * precision, factorBig))
  }

  /**
   * Allocate proportionally. The sum of all parts always equals the original —
   * any rounding remainder is distributed to the first buckets.
   *
   * @example
   * money('10.00', 'USD').allocate([1, 1, 1])
   * // [Money('3.34'), Money('3.33'), Money('3.33')]
   */
  allocate(ratios: readonly number[]): Money<C>[] {
    if (ratios.length === 0) throw new InvalidAmountError('ratios array must not be empty')
    const total = ratios.reduce((a, b) => a + b, 0)
    if (total <= 0) throw new InvalidAmountError('ratios must sum to a positive number')

    // Use large integer precision to avoid float loss in ratio math
    const PRECISION = 1_000_000n
    const totalBig = BigInt(Math.round(total * Number(PRECISION)))

    const shares = ratios.map((r) => {
      const rBig = BigInt(Math.round(r * Number(PRECISION)))
      return roundDiv(this.#minorUnits * rBig, totalBig)
    })

    // Distribute rounding remainder so that sum(shares) === this.#minorUnits
    let remainder = this.#minorUnits - shares.reduce((a, b) => a + b, 0n)
    const direction = remainder > 0n ? 1n : -1n
    for (let i = 0; remainder !== 0n; i++) {
      // shares always has enough entries because ratios.length > 0
      shares[i % shares.length]! += direction
      remainder -= direction
    }

    return shares.map((u) => this.#fromUnits(u))
  }

  // ─── Comparison ────────────────────────────────────────────────────────────

  equals(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#minorUnits === other.#minorUnits
  }

  greaterThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#minorUnits > other.#minorUnits
  }

  lessThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#minorUnits < other.#minorUnits
  }

  greaterThanOrEqual(other: Money<C>): boolean {
    return !this.lessThan(other)
  }

  lessThanOrEqual(other: Money<C>): boolean {
    return !this.greaterThan(other)
  }

  isZero(): boolean {
    return this.#minorUnits === 0n
  }

  isPositive(): boolean {
    return this.#minorUnits > 0n
  }

  isNegative(): boolean {
    return this.#minorUnits < 0n
  }

  abs(): Money<C> {
    return this.#fromUnits(this.#minorUnits < 0n ? -this.#minorUnits : this.#minorUnits)
  }

  negate(): Money<C> {
    return this.#fromUnits(-this.#minorUnits)
  }

  // ─── Formatting ────────────────────────────────────────────────────────────

  /**
   * Format using the platform's `Intl.NumberFormat` — no custom format strings.
   *
   * @example
   * money('19.99', 'USD').format()        // "$19.99"
   * money('19.99', 'EUR').format('de-DE') // "19,99 €"
   */
  format(locale?: string): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.#currency,
      minimumFractionDigits: this.#decimals,
      maximumFractionDigits: this.#decimals,
    }).format(Number(this.decimalValue))
  }

  // ─── Serialisation ─────────────────────────────────────────────────────────

  /** Safe to store in JSON — no float representation. */
  toJSON(): { amount: string; currency: C; minorUnits: string } {
    return {
      amount: this.decimalValue,
      currency: this.#currency,
      minorUnits: this.#minorUnits.toString(),
    }
  }

  toString(): string {
    return `${this.decimalValue} ${this.#currency}`
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  #fromUnits(units: bigint): Money<C> {
    return new Money<C>(minorUnitsToString(units, this.#decimals), this.#currency)
  }

  #assertSameCurrency(other: Money<C>): void {
    if (this.#currency !== other.#currency) {
      throw new CurrencyMismatchError(this.#currency, other.#currency as string)
    }
  }
}
