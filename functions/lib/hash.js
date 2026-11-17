export async function hashIp(ip, salt = "") {
  const bytes = new TextEncoder().encode(`${ip || "unknown"}|${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("").slice(0, 32);
}
