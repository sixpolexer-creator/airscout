import type { FlightOffer } from "@/lib/types";

// Minimal shape needed to build a price-comparison link.
export interface BookingItinerary {
  origin: string;       // IATA
  destination: string;  // IATA
  departDate: string;   // YYYY-MM-DD
  returnDate?: string;  // YYYY-MM-DD (round trips)
}

export interface BookingTarget {
  url: string;
  name: string; // human label, e.g. "Google Flights"
}

export function buildBookingItinerary(offer: FlightOffer): BookingItinerary {
  return {
    origin: offer.origin,
    destination: offer.destination,
    departDate: offer.departDate,
    returnDate: offer.roundTrip ? offer.inbound?.departDate : undefined,
  };
}

// Google Flights honors a natural-language `q` deep link and renders real,
// live prices for the exact route + date(s). It works for every carrier and
// is the reliable "see the real price" handoff for our estimated offers.
function googleFlightsUrl(i: BookingItinerary): string {
  const parts = [`Flights from ${i.origin} to ${i.destination} on ${i.departDate}`];
  if (i.returnDate) parts.push(`returning ${i.returnDate}`);
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(parts.join(" "))}`;
}

// Every "See live price" CTA routes to Google Flights for the exact itinerary.
export function bookingTarget(offer: FlightOffer): BookingTarget {
  return { url: googleFlightsUrl(buildBookingItinerary(offer)), name: "Google Flights" };
}

// Back-compat helper: just the URL.
export function generateBookingUrl(offer: FlightOffer): string {
  return bookingTarget(offer).url;
}
