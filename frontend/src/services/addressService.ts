import axios from '@/lib/axios';

export type AddressType = 'home' | 'work' | 'other';

export interface SavedAddress {
  id: string;
  userId?: string;
  type: AddressType;
  name: string;
  phone: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressPayload {
  type: AddressType;
  name: string;
  phone: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const MAX_SAVED_ADDRESSES = 3;

class AddressService {
  async list(): Promise<SavedAddress[]> {
    const { data } = await axios.get<ApiEnvelope<SavedAddress[]>>('/auth/addresses');
    return data.data ?? [];
  }

  async create(payload: AddressPayload): Promise<SavedAddress> {
    const { data } = await axios.post<ApiEnvelope<SavedAddress>>('/auth/addresses', payload);
    if (!data.success || !data.data) throw new Error(data.error || 'Failed to add address');
    return data.data;
  }

  async update(id: string, payload: AddressPayload): Promise<SavedAddress> {
    const { data } = await axios.put<ApiEnvelope<SavedAddress>>(`/auth/addresses/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.error || 'Failed to update address');
    return data.data;
  }

  async remove(id: string): Promise<void> {
    const { data } = await axios.delete<ApiEnvelope<null>>(`/auth/addresses/${id}`);
    if (!data.success) throw new Error(data.error || 'Failed to delete address');
  }

  async setDefault(id: string): Promise<SavedAddress> {
    const { data } = await axios.patch<ApiEnvelope<SavedAddress>>(`/auth/addresses/${id}/default`);
    if (!data.success || !data.data) throw new Error(data.error || 'Failed to set default address');
    return data.data;
  }
}

export const addressService = new AddressService();
export default addressService;
