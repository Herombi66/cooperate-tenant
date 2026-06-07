import api from './api';
import type { AnimalAcquisitionRequest, AnimalCatalogItem, PaginationMeta } from '../types';

export class AnimalRequestService {
  private static baseUrl = '/layyah/purchase-requests';

  static async getAnimalCatalog(): Promise<AnimalCatalogItem[]> {
    const res = await api.get('/layyah/catalog/animal-categories');
    return res.data?.items || [];
  }

  static async list(params: {
    page?: number;
    limit?: number;
    status?: 'all' | 'draft' | 'pending' | 'approved' | 'rejected';
    q?: string;
  }): Promise<{ items: AnimalAcquisitionRequest[]; pagination: PaginationMeta }> {
    const res = await api.get(this.baseUrl, { params });
    return {
      items: res.data?.items || [],
      pagination: res.data?.pagination || { total: 0, page: 1, limit: 20, pages: 0 }
    };
  }

  static async getById(id: number): Promise<AnimalAcquisitionRequest> {
    const res = await api.get(`${this.baseUrl}/${id}`);
    return res.data?.item;
  }

  static async createDraft(payload: {
    member_user_id: number;
    animal_category?: string | null;
    quantity?: number | null;
    delivery_start_date?: string | null;
    delivery_end_date?: string | null;
    reason_html?: string | null;
  }): Promise<AnimalAcquisitionRequest> {
    const res = await api.post(this.baseUrl, payload);
    return res.data?.item;
  }

  static async updateDraft(
    id: number,
    payload: {
      animal_category?: string | null;
      quantity?: number | null;
      delivery_start_date?: string | null;
      delivery_end_date?: string | null;
      reason_html?: string | null;
    }
  ): Promise<AnimalAcquisitionRequest> {
    const res = await api.put(`${this.baseUrl}/${id}`, payload);
    return res.data?.item;
  }

  static async submit(id: number): Promise<AnimalAcquisitionRequest> {
    const res = await api.post(`${this.baseUrl}/${id}/submit`);
    return res.data?.item;
  }

  static async approve(id: number): Promise<AnimalAcquisitionRequest> {
    const res = await api.post(`${this.baseUrl}/${id}/approve`);
    return res.data?.item;
  }

  static async reject(id: number, rejection_reason: string): Promise<AnimalAcquisitionRequest> {
    const res = await api.post(`${this.baseUrl}/${id}/reject`, { rejection_reason });
    return res.data?.item;
  }

  static async deleteDraft(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

