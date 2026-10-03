/**
 * Erreurs métier de Mariemeshoes
 */
export class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Plus assez de paires pour une pointure (ex. « Air Force 1 '07 Triple White — 43 »). */
export class StockInsuffisantError extends DomainError {
  constructor(public readonly pairLabel: string, public readonly available: number) {
    super(
      available > 0
        ? `Il ne reste que ${available} paire(s) pour « ${pairLabel} »`
        : `« ${pairLabel} » n'est plus disponible`,
      'STOCK_INSUFFICIENT'
    );
    this.name = 'StockInsuffisantError';
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Produit introuvable : ${identifier}`, 'PRODUCT_NOT_FOUND');
    this.name = 'ProductNotFoundError';
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(orderIdOrReference: string) {
    super(`Commande introuvable : ${orderIdOrReference}`, 'ORDER_NOT_FOUND');
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Transition de statut non autorisée : impossible de passer de "${fromStatus}" à "${toStatus}"`,
      'INVALID_STATUS_TRANSITION'
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Accès non autorisé aux fonctionnalités administrateur') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly errors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
