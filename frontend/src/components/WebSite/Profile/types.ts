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
  /** Avatar URL. Absent until the account sets one; the loader maps it to ''. */
  image?: string
  gender: 'male' | 'female' | 'other'
  joinDate: string
  preferences: {
    newsletter: boolean
    smsNotifications: boolean
    emailNotifications: boolean
  }
}
