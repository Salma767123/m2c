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
  /** Phone number digits only — country code lives in `phoneCode`. */
  phone: string;
  /** Country dial code, e.g. "+91". Split from `phone` for the UI, same as web. */
  phoneCode: string;
  /** WhatsApp number digits only — country code lives in `whatsappCode`. */
  whatsapp: string;
  /** Country dial code for WhatsApp. */
  whatsappCode: string;
  /** Avatar URL. Absent until the account sets one; the loader maps it to ''. */
  image?: string;
  gender: 'male' | 'female' | 'other' | '';
  address: Address;
  joinDate: string;
  preferences: {
    newsletter: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
  };
}
