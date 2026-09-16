export interface Address {
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UserProfile {
  id: string;
  /** Honorific — matches the web's Title select. */
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  /** WhatsApp contact, stored separately from `phone` on the backend. */
  whatsappNumber: string;
  gender: 'male' | 'female' | 'other';
  address: Address;
  joinDate: string;
  preferences: {
    newsletter: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
  };
}
