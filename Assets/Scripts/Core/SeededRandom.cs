using System;

namespace EveRogue.Core
{
    public sealed class SeededRandom
    {
        private readonly Random random;

        public SeededRandom(int seed)
        {
            random = new Random(seed);
        }

        public int Range(int minInclusive, int maxExclusive)
        {
            if (maxExclusive <= minInclusive)
            {
                return minInclusive;
            }

            return random.Next(minInclusive, maxExclusive);
        }

        public float Range(float minInclusive, float maxInclusive)
        {
            if (maxInclusive <= minInclusive)
            {
                return minInclusive;
            }

            return (float)(minInclusive + random.NextDouble() * (maxInclusive - minInclusive));
        }

        public bool Chance(float probability)
        {
            if (probability <= 0f)
            {
                return false;
            }

            if (probability >= 1f)
            {
                return true;
            }

            return random.NextDouble() < probability;
        }
    }
}
