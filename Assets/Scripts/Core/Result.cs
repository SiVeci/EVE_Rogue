using System;

namespace EveRogue.Core
{
    public readonly struct Result
    {
        public bool Success { get; }
        public string Error { get; }

        private Result(bool success, string error)
        {
            Success = success;
            Error = error ?? string.Empty;
        }

        public static Result Ok() => new Result(true, string.Empty);

        public static Result Fail(string error)
        {
            if (string.IsNullOrWhiteSpace(error))
            {
                throw new ArgumentException("Failure results require an error message.", nameof(error));
            }

            return new Result(false, error);
        }
    }

    public readonly struct Result<T>
    {
        public bool Success { get; }
        public string Error { get; }
        public T Value { get; }

        private Result(bool success, T value, string error)
        {
            Success = success;
            Value = value;
            Error = error ?? string.Empty;
        }

        public static Result<T> Ok(T value) => new Result<T>(true, value, string.Empty);

        public static Result<T> Fail(string error)
        {
            if (string.IsNullOrWhiteSpace(error))
            {
                throw new ArgumentException("Failure results require an error message.", nameof(error));
            }

            return new Result<T>(false, default, error);
        }
    }
}
