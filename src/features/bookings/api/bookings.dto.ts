export interface BookingServiceItemDto {
  id: string;
  title: string;
  priceInCents: number;
  durationInMinutes: number;
}

export interface BookingCustomerDto {
  id: string;
  name: string;
  phoneNumber?: string | null;
}

export interface BookingDto {
  id: string;
  barbershopId: string;
  barbermanId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt?: string | null;
  customer?: BookingCustomerDto;
  services: BookingServiceItemDto[];
  status?: string | null;
  totalPriceInCents?: number;
  totalDurationInMinutes?: number;
  clientRequestId?: string | null;
}

export interface CreateBookingRequestDto {
  serviceIds: string[];
  barbermanId: string;
  date: string;
  startTime: string;
  endTime?: string;
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
}

export interface ProfessionalDto {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

export interface ListProfessionalsResponse {
  professionals: ProfessionalDto[];
}

export interface FetchMyBookingsResponse {
  bookings: BookingDto[];
}
