
export function isListener(name) {
  const strCode = name?.charCodeAt(2);
  return name && name.startsWith("on") && strCode >= 65 && strCode <= 90;
}

export function getListenerName(name) {
  return `on${name.charAt(2).toLocaleLowerCase()}${name.substring(3)}`;
}