export type HomeSection = {
  sectionId: number;
  type: string;
  title?: string;
  subtitle?: string;
  position: number;
  gender?: string;
};

export type HomeSectionItem = {
  itemId: number;
  image?: string;
  heading?: string;
  subheading?: string;
  ctaText?: string;
  link?: string;
  productId?: number;
  categoryId?: number;
  reviewId?: number;
  position?: number;
};