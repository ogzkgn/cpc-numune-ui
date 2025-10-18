export const mapById = <T extends { id: number }>(items: T[]) => {
  const map = new Map<number, T>();
  items.forEach((item) => map.set(item.id, item));
  return map;
};

export const groupBy = <T, K>(items: T[], getKey: (item: T) => K) => {
  const groups = new Map<K, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });
  return groups;
};