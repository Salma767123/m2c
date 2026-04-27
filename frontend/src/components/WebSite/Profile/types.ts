export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  joinDate: string
  preferences: {
    newsletter: boolean
    smsNotifications: boolean
    emailNotifications: boolean
  }
}
