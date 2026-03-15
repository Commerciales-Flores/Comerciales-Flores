import type { ContentSettings, ParkingSlot } from './types';

export const MOCK_PARKING_SLOTS: ParkingSlot[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i + 1}`,
  name: `Slot ${i + 1}`,
  imageUrl: `https://placehold.co/400x300/e2e8f0/475569?text=Slot%20${i + 1}`,
}));

export const DEFAULT_CONTENT: ContentSettings = {
  hero: {
    badge: 'Premium Spaces',
    title: '',
    subtitle: '',
    image: '',
    primaryCtaText: 'Get Started',
    primaryCtaLink: '/register',
    secondaryCtaText: 'Browse Collection',
    secondaryCtaLink: '#properties',
  },
  about: {
    eyebrow: 'Who We Are',
    title: 'About Us',
    text: '',
    cards: [
      {
        title: 'Flexible Spaces',
        text: 'Rental spaces designed for businesses, events, and evolving needs.',
      },
      {
        title: 'Prime Convenience',
        text: 'Accessible locations that make bookings easier for clients and guests.',
      },
      {
        title: 'Trusted Service',
        text: 'A smoother and more reliable way to manage reservations and inquiries.',
      },
    ],
  },
  history: {
    eyebrow: 'Our History',
    title: '',
    subtitle: '',
    text: '',
    image: '',
    images: [],
    points: [
      {
        title: 'The Beginning',
        text: 'A vision to create accessible and flexible commercial spaces.',
      },
      {
        title: 'Growth',
        text: 'Expanded to serve more clients, events, and rental needs.',
      },
      {
        title: 'Today',
        text: 'A trusted destination for business spaces and function venues.',
      },
    ],
  },
  featured: {
    title: 'Featured Spaces',
    subtitle: 'Experience our most premium locations.',
    viewAllText: 'View all Spaces',
    emptyTitle: 'No featured spaces yet',
    emptyText:
      'There are currently no available featured spaces to display. Please check back later.',
  },
  contact: {
    title: 'Send us a message',
    subtitle: 'We’ll get back to you as soon as possible.',
    locationTitle: 'Our Location',
    locationSubtitle: 'Visit us',
    email: '',
    phone: '',
    address: '',
  },
  footer: {
    brandName: 'Commerciales Flores',
    brandDescription:
      'Premium rental spaces and function halls for your business or event needs.',
    quickLinksTitle: 'Quick Links',
    contactTitle: 'Get in Touch',
    copyright: '© 2025 Commerciales Flores. All rights reserved.',
    privacyText: 'Compliant with the Philippine Data Privacy Act of 2012',
  },
  menu: {
    title: 'Menu',
  },
  announcements: [],
  policies: '',
};