function normaliseSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function allowedDistance(length: number) {
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  if (length <= 12) return 3;
  return 4;
}

export function correctRecipeSearchQuery(query: string, candidateLabels: string[]) {
  const normalisedQuery = normaliseSearchText(query);
  if (!normalisedQuery) return query.trim();

  const candidates = Array.from(new Set(candidateLabels
    .flatMap(label => normaliseSearchText(label).split(/[\s-]+/))
    .filter(word => word.length >= 3)));
  const candidateSet = new Set(candidates);

  const correctedWords = normalisedQuery.split(" ").map(word => {
    if (word.length < 4 || candidateSet.has(word)) return word;

    let closest = word;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (Math.abs(candidate.length - word.length) > allowedDistance(word.length)) continue;
      const distance = editDistance(word, candidate);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }

    const similarity = 1 - (closestDistance / Math.max(word.length, closest.length));
    return closestDistance <= allowedDistance(word.length) && similarity >= 0.68 ? closest : word;
  });

  return correctedWords.join(" ");
}
