using System;
using System.Collections.Generic;

namespace EveRogue.Core
{
    public static class GameIds
    {
        public static Result ValidateUnique(IEnumerable<string> ids)
        {
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var id in ids)
            {
                if (string.IsNullOrWhiteSpace(id))
                {
                    return Result.Fail("Definition id cannot be empty.");
                }

                if (!seen.Add(id))
                {
                    return Result.Fail($"Duplicate definition id: {id}");
                }
            }

            return Result.Ok();
        }
    }
}
