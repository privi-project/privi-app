import React from 'react';
import { Text } from 'react-native';
import { GiftIcon, TagIcon, StackIcon, ArrowUpIcon } from '@/components/NavIcons';

interface Props {
  offerType: string;
  color: string;
  size?: number;
}

// One icon per offer type — previously every offer showed the same fixed
// icon regardless of type (Admin_Portal_Structure.docx Section 5's
// OFFER_TYPES list). Plain glyphs for the money-shaped types (%, £, ×2),
// real line icons for the more conceptual ones. Founder-reviewed at
// actual render size before being built in (2026-08-19).
export function OfferTypeIcon({ offerType, color, size = 16 }: Props) {
  switch (offerType) {
    case 'fixed_amount_discount':
      return <Text style={{ fontSize: size, fontWeight: '700', color }}>£</Text>;
    case 'fixed_member_price':
      return <TagIcon color={color} size={size} />;
    case 'bundle':
      return <StackIcon color={color} size={size} />;
    case 'bogo':
      return <Text style={{ fontSize: size - 2, fontWeight: '700', color }}>×2</Text>;
    case 'free_item':
      return <GiftIcon color={color} size={size} />;
    case 'upgrade':
      return <ArrowUpIcon color={color} size={size} />;
    case 'percentage_discount':
    default:
      // Also the fallback for any future type added to OFFER_TYPES
      // without a matching case here — better than showing nothing.
      return <Text style={{ fontSize: size, fontWeight: '700', color }}>%</Text>;
  }
}
