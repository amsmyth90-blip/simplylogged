const inviteToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pathToken(pathname: string, prefix: string) {
  if (!pathname.startsWith(prefix)) return null;
  const candidate = decodeURIComponent(pathname.slice(prefix.length));
  return inviteToken.test(candidate) ? candidate.toLowerCase() : null;
}

export function parseHouseholdInviteUrl(value: string, apiOrigin: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === "diarydock:" && url.hostname === "family") {
      return pathToken(url.pathname, "/invite/");
    }
    if (url.protocol === "https:" && url.origin === new URL(apiOrigin).origin) {
      return pathToken(url.pathname, "/family/invite/");
    }
  } catch {
    return null;
  }
  return null;
}
