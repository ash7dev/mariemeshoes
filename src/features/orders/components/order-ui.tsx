import { MessageCircle, Phone } from 'lucide-react';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink } from '@/lib/whatsapp';
import { ORDER_STATUS_UI, paymentUi } from '../labels';

const chip = 'inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold';

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const ui = ORDER_STATUS_UI[status];
  return <span className={cn(chip, ui.chip, className)}>{ui.label}</span>;
}

export function PaymentChip({ method, status, className }: { method: PaymentMethod; status: PaymentStatus; className?: string }) {
  const ui = paymentUi(method, status);
  return <span className={cn(chip, ui.chip, className)}>{ui.label}</span>;
}

/** Appeler / écrire sur WhatsApp au client (message prérempli, avec la référence s'il s'agit d'une commande). */
export function ContactButtons({ phone, customerName, reference }: { phone: string; customerName: string; reference?: string }) {
  const firstName = customerName.split(' ')[0];
  const whatsapp = whatsappLink(
    phone,
    reference ? `Bonjour ${firstName}, ici Mariemeshoes au sujet de votre commande ${reference}.` : `Bonjour ${firstName}, ici Mariemeshoes.`,
  );
  const button = 'grid size-11 place-items-center rounded-full transition-opacity hover:opacity-90';
  return (
    <>
      <a href={`tel:${phone}`} aria-label={`Appeler ${customerName} au ${formatSenegalPhone(phone)}`} className={cn(button, 'bg-card text-ink')}>
        <Phone className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
      </a>
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Écrire à ${customerName} sur WhatsApp`} className={cn(button, 'bg-deep text-cream')}>
          <MessageCircle className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </a>
      )}
    </>
  );
}

/** « Réservation : expire dans 1 h 20 » / « expirée » (commande à confirmer). */
export function expiryLabel(expiresAt: Date | null, now = new Date()): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null;
  const minutes = Math.round((expiresAt.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return { text: 'Réservation expirée : annulation automatique imminente', urgent: true };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const duration = hours > 0 ? `${hours} h${rest ? ` ${String(rest).padStart(2, '0')}` : ''}` : `${minutes} min`;
  return { text: `Réservation : expire dans ${duration}`, urgent: minutes < 60 };
}
