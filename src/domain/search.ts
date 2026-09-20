/** Case- and accent-insensitive Vietnamese matching, including capital Đ. */
export const normalizeSearch = (text: string) =>
  text
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
