export { Money } from './money.js';
export { CURRENCIES } from './currencies.js';
export type { CurrencyCode, CurrencyDef } from './currencies.js';
export {
  MonetaError,
  CurrencyMismatchError,
  DivisionByZeroError,
  InvalidAmountError,
  UnknownCurrencyError,
} from './errors.js';

import type { CurrencyCode } from './currencies.js';
import { Money } from './money.js';

/**
 * Create a Money value. This is the primary entry point.
 *
 * @example
 * import { money } from 'moneta'
 *
 * const price = money('19.99', 'USD')
 * const tax   = money('1.60',  'USD')
 * price.add(tax).format()  // "$21.59"
 */
export function money<C extends CurrencyCode>(
  amount: string | number | bigint,
  currency: C,
): Money<C> {
  return new Money(amount, currency);
}
