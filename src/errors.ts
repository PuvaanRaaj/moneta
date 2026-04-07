export class MonetaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonetaError';
    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CurrencyMismatchError extends MonetaError {
  readonly expected: string;
  readonly received: string;

  constructor(expected: string, received: string) {
    super(
      `Currency mismatch: cannot operate on ${expected} and ${received}. Convert to a common currency first.`,
    );
    this.name = 'CurrencyMismatchError';
    this.expected = expected;
    this.received = received;
  }
}

export class InvalidAmountError extends MonetaError {
  readonly input: unknown;

  constructor(input: unknown) {
    super(
      `Invalid amount: "${String(input)}". Expected a numeric string (e.g. "19.99"), a number, or a bigint.`,
    );
    this.name = 'InvalidAmountError';
    this.input = input;
  }
}

export class DivisionByZeroError extends MonetaError {
  constructor() {
    super('Division by zero is not allowed.');
    this.name = 'DivisionByZeroError';
  }
}

export class UnknownCurrencyError extends MonetaError {
  readonly currency: string;

  constructor(currency: string) {
    super(
      `Unknown currency code: "${currency}". See the CurrencyCode type for supported currencies.`,
    );
    this.name = 'UnknownCurrencyError';
    this.currency = currency;
  }
}
