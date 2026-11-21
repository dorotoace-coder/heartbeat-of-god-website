export const money = (currency: string, amount: number) =>
  `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const label = (value: string) => value.replaceAll("_", " ");
