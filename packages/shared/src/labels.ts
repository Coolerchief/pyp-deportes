// Enum values of the database (docs/05-BACKEND-SCHEMA.md §3) and their Spanish labels.

export const CUSTOMER_TYPES = [
  'league_team',
  'school_academy',
  'company_institution',
  'individual',
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export const customerTypeLabels: Record<CustomerType, string> = {
  league_team: 'Liga o equipo',
  school_academy: 'Escuela o academia',
  company_institution: 'Empresa o institución',
  individual: 'Particular',
};

export const DELIVERY_METHODS = ['pickup', 'shipping'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  pickup: 'Recoger en tienda Coapa',
  shipping: 'Envío (lo acordamos por WhatsApp)',
};

export const QUOTE_STATUSES = ['new', 'in_progress', 'quoted', 'won', 'lost'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const quoteStatusLabels: Record<QuoteStatus, string> = {
  new: 'Nueva',
  in_progress: 'En atención',
  quoted: 'Cotizada',
  won: 'Ganada',
  lost: 'Perdida',
};

/** Allowed status changes (§4.5); admin_set_quote_status enforces the same map. */
export const quoteStatusTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
  new: ['in_progress', 'quoted', 'lost'],
  in_progress: ['quoted', 'lost'],
  quoted: ['won', 'lost'],
  won: ['quoted'],
  lost: ['in_progress'],
};

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const productStatusLabels: Record<ProductStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

export const AUDIENCES = ['adulto', 'infantil', 'unisex'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const TECHNIQUES = ['sublimacion', 'vinil', 'bordado', 'serigrafia'] as const;
export type Technique = (typeof TECHNIQUES)[number];
export const techniqueLabels: Record<Technique, string> = {
  sublimacion: 'Sublimación',
  vinil: 'Vinil textil',
  bordado: 'Bordado',
  serigrafia: 'Serigrafía',
};
