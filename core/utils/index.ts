
export function isListener(name: string): boolean {
  const strCode = name?.charCodeAt(2);
  return Boolean(name) && name.startsWith("on") && strCode >= 65 && strCode <= 90;
}

export function getListenerName(name: string): string {
  return `on${name.charAt(2).toLocaleLowerCase()}${name.substring(3)}`;
}