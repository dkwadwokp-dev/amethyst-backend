export function generateReference(prefix: string, length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = prefix;
  for (let i = 0; i < length; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}
