import type { Product } from "@/types/app";

export function calculateCompanyShare(
  product: Product | undefined,
  salePrice: number,
): number {
  if (!product) {
    return 0;
  }

  switch (product.companyShareMethod) {
    case "fixed_amount":
      return Math.max(0, product.companyShareFixedAmount);
    case "percentage_of_sales":
      return Math.max(0, Math.round(salePrice * product.companyShareRate));
    case "sales_minus_cost":
      return Math.max(0, salePrice - product.cost);
    case "manual":
    default:
      return 0;
  }
}
