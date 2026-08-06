export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "0 đ";
  return (
    Math.round(amount).toLocaleString("vi-VN", {
      maximumFractionDigits: 0,
    }) + " đ"
  );
}

export function formatNumber(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "0";
  return Math.round(amount).toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });
}
