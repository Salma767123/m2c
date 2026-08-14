export interface UserProfile {
  id: string
  title?: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  phoneCode?: string
  whatsapp?: string
  whatsappCode?: string
  image?: string
  gender: 'male' | 'female' | 'other'
  joinDate: string
  preferences: {
    newsletter: boolean
    smsNotifications: boolean
    emailNotifications: boolean
  }
}
