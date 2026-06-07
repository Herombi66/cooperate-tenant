import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

vi.mock('./api', () => ({
  default: apiMock
}));

describe('AnimalRequestService', async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads animal catalog', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { items: [{ value: 'goat', label: 'Goat' }] } });
    const { AnimalRequestService } = await import('./animalRequestService');
    const items = await AnimalRequestService.getAnimalCatalog();
    expect(apiMock.get).toHaveBeenCalledWith('/layyah/catalog/animal-categories');
    expect(items[0].value).toBe('goat');
  });

  it('lists requests with params', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { items: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } } });
    const { AnimalRequestService } = await import('./animalRequestService');
    const res = await AnimalRequestService.list({ page: 2, limit: 10, status: 'pending', q: 'MBR' });
    expect(apiMock.get).toHaveBeenCalledWith('/layyah/purchase-requests', { params: { page: 2, limit: 10, status: 'pending', q: 'MBR' } });
    expect(res.pagination.page).toBe(1);
  });

  it('creates, updates, submits, approves, rejects, and deletes drafts', async () => {
    apiMock.post.mockResolvedValueOnce({ data: { item: { id: 1 } } });
    apiMock.put.mockResolvedValueOnce({ data: { item: { id: 1, animal_category: 'cow' } } });
    apiMock.post.mockResolvedValueOnce({ data: { item: { id: 1, status: 'pending' } } });
    apiMock.post.mockResolvedValueOnce({ data: { item: { id: 1, status: 'approved' } } });
    apiMock.post.mockResolvedValueOnce({ data: { item: { id: 1, status: 'rejected' } } });
    apiMock.delete.mockResolvedValueOnce({ data: { success: true } });

    const { AnimalRequestService } = await import('./animalRequestService');

    await AnimalRequestService.createDraft({ member_user_id: 10 });
    expect(apiMock.post).toHaveBeenCalledWith('/layyah/purchase-requests', { member_user_id: 10 });

    await AnimalRequestService.updateDraft(1, { animal_category: 'cow' });
    expect(apiMock.put).toHaveBeenCalledWith('/layyah/purchase-requests/1', { animal_category: 'cow' });

    await AnimalRequestService.submit(1);
    expect(apiMock.post).toHaveBeenCalledWith('/layyah/purchase-requests/1/submit');

    await AnimalRequestService.approve(1);
    expect(apiMock.post).toHaveBeenCalledWith('/layyah/purchase-requests/1/approve');

    await AnimalRequestService.reject(1, 'No stock');
    expect(apiMock.post).toHaveBeenCalledWith('/layyah/purchase-requests/1/reject', { rejection_reason: 'No stock' });

    await AnimalRequestService.deleteDraft(1);
    expect(apiMock.delete).toHaveBeenCalledWith('/layyah/purchase-requests/1');
  });
});

