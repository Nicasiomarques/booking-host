/**
 * Either type for functional error handling
 * Left represents an error, Right represents success
 */
export type Either<L, R> = Left<L> | Right<R>

export class Left<L> {
  readonly _tag = 'Left' as const
  constructor(public readonly value: L) {}

  isLeft(): this is Left<L> {
    return true
  }

  isRight(): this is Right<never> {
    return false
  }

  map<B>(_f: (r: never) => B): Either<L, B> {
    return this as unknown as Either<L, B>
  }

  flatMap<B>(_f: (r: never) => Either<L, B>): Either<L, B> {
    return this as unknown as Either<L, B>
  }

  fold<B>(onLeft: (l: L) => B, _onRight: (r: never) => B): B {
    return onLeft(this.value)
  }

  getOrThrow(): never {
    throw this.value
  }

  getOrElse<B>(defaultValue: B): B {
    return defaultValue
  }
}

export class Right<R> {
  readonly _tag = 'Right' as const
  constructor(public readonly value: R) {}

  isLeft(): this is Left<never> {
    return false
  }

  isRight(): this is Right<R> {
    return true
  }

  map<B>(f: (r: R) => B): Either<never, B> {
    return right(f(this.value))
  }

  flatMap<L, B>(f: (r: R) => Either<L, B>): Either<L, B> {
    return f(this.value)
  }

  fold<B>(_onLeft: (l: never) => B, onRight: (r: R) => B): B {
    return onRight(this.value)
  }

  getOrThrow(): R {
    return this.value
  }

  getOrElse<B>(_defaultValue: B): R {
    return this.value
  }
}

/**
 * Creates a Left (error) value
 */
export function left<L, R = never>(value: L): Either<L, R> {
  return new Left(value)
}

/**
 * Creates a Right (success) value
 */
export function right<L = never, R = never>(value: R): Either<L, R> {
  return new Right(value)
}

/**
 * Type guard to check if an Either is Left
 */
export function isLeft<L, R>(either: Either<L, R>): either is Left<L> {
  return either.isLeft()
}

/**
 * Type guard to check if an Either is Right
 */
export function isRight<L, R>(either: Either<L, R>): either is Right<R> {
  return either.isRight()
}

/**
 * Helper to convert a Promise that might throw into an Either
 */
export async function fromPromise<L, R>(
  promise: Promise<R>,
  errorMapper: (error: unknown) => L
): Promise<Either<L, R>> {
  try {
    const value = await promise
    return right(value)
  } catch (error) {
    return left(errorMapper(error))
  }
}

/**
 * Helper to convert a function that might throw into one that returns Either
 */
export function fromThrowable<L, R, Args extends any[]>(
  fn: (...args: Args) => R,
  errorMapper: (error: unknown) => L
): (...args: Args) => Either<L, R> {
  return (...args: Args) => {
    try {
      return right(fn(...args))
    } catch (error) {
      return left(errorMapper(error))
    }
  }
}

/**
 * Helper to convert an async function that might throw into one that returns Either
 */
export function fromAsyncThrowable<L, R, Args extends any[]>(
  fn: (...args: Args) => Promise<R>,
  errorMapper: (error: unknown) => L
): (...args: Args) => Promise<Either<L, R>> {
  return async (...args: Args) => {
    try {
      const value = await fn(...args)
      return right(value)
    } catch (error) {
      return left(errorMapper(error))
    }
  }
}
