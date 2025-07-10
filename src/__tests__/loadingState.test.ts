import { createStoreRegistry } from '../createStoreRegistry';
import { 
  defaultLoadingState, 
  getLoadingState, 
  setLoadingState, 
  initiateAction, 
  finishAction, 
  actionError 
} from '../loadingState';

// Simple mock axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

interface TestUser {
  id: number;
  name: string;
  email: string;
}

describe('loadingState', () => {
  let getOrCreateStore: any;
  let store: any;

  beforeEach(() => {
    getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true, create: true, update: true, delete: true },
    });
  });

  describe('defaultLoadingState', () => {
    it('should have correct default values', () => {
      expect(defaultLoadingState).toEqual({
        isLoading: false,
        error: null,
        response: undefined,
        id: undefined,
        sequence: 0,
      });
    });
  });

  describe('getLoadingState', () => {
    it('should return default loading state for non-existent action', () => {
      const loadingState = getLoadingState(store, 'nonexistent');
      expect(loadingState).toEqual(defaultLoadingState);
    });

    it('should return actual loading state for existing action', () => {
      const state = store.getState();
      state.setLoadingState('getList', { isLoading: true, error: null });

      const loadingState = getLoadingState(store, 'getList');
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();
      expect(loadingState.sequence).toBe(0);
    });
  });

  describe('setLoadingState', () => {
    it('should set loading state correctly', () => {
      setLoadingState(store, 'getList', { 
        isLoading: true, 
        error: null, 
        id: 123 
      });

      const state = store.getState();
      expect(state.loadingState.getList).toEqual({
        isLoading: true,
        error: null,
        response: undefined,
        id: 123,
        sequence: 0,
      });
    });

    it('should increment sequence on subsequent calls', () => {
      setLoadingState(store, 'getList', { isLoading: true });
      setLoadingState(store, 'getList', { isLoading: false });

      const state = store.getState();
      expect(state.loadingState.getList.sequence).toBe(1);
    });
  });

  describe('initiateAction', () => {
    it('should set loading state to loading with defaults', () => {
      initiateAction(store, 'create');

      const loadingState = getLoadingState(store, 'create');
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBeNull();
      expect(loadingState.id).toBeNull();
    });

    it('should set loading state with custom values', () => {
      initiateAction(store, 'update', { id: 456 });

      const loadingState = getLoadingState(store, 'update');
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBeNull();
      expect(loadingState.id).toBe(456);
    });

    it('should handle undefined additional loading state', () => {
      initiateAction(store, 'delete');

      const loadingState = getLoadingState(store, 'delete');
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBeNull();
      expect(loadingState.id).toBeNull();
    });
  });

  describe('finishAction', () => {
    it('should set loading state to finished with no response', () => {
      finishAction(store, 'create');

      const loadingState = getLoadingState(store, 'create');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBeNull();
      expect(loadingState.id).toBeNull();
    });

    it('should set loading state to finished with response', () => {
      const mockResponse = { id: 123, name: 'Test User' };
      finishAction(store, 'update', mockResponse);

      const loadingState = getLoadingState(store, 'update');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBe(mockResponse);
      expect(loadingState.id).toBe(123);
    });

    it('should handle response without id', () => {
      const mockResponse = { name: 'Test User', email: 'test@example.com' };
      finishAction(store, 'getList', mockResponse);

      const loadingState = getLoadingState(store, 'getList');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBe(mockResponse);
      expect(loadingState.id).toBeNull();
    });

    it('should handle null response', () => {
      finishAction(store, 'delete', null);

      const loadingState = getLoadingState(store, 'delete');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBeNull();
      expect(loadingState.response).toBeNull();
      expect(loadingState.id).toBeNull();
    });
  });

  describe('actionError', () => {
    it('should set error state', () => {
      const mockError = new Error('Test error');
      actionError(store, 'getList', mockError);

      const loadingState = getLoadingState(store, 'getList');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBe(mockError);
      expect(loadingState.response).toBeNull();
    });

    it('should handle string errors', () => {
      const stringError = 'String error';
      actionError(store, 'create', stringError);

      const loadingState = getLoadingState(store, 'create');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBe(stringError);
      expect(loadingState.response).toBeNull();
    });
  });

  describe('action lifecycle', () => {
    it('should handle complete action lifecycle', () => {
      // Initial state
      let loadingState = getLoadingState(store, 'getList');
      expect(loadingState.sequence).toBe(0);

      // Initiate action
      initiateAction(store, 'getList', { id: 123 });
      loadingState = getLoadingState(store, 'getList');
      expect(loadingState.sequence).toBe(0);
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.id).toBe(123);

      // Finish action
      finishAction(store, 'getList', { id: 123, data: 'success' });
      loadingState = getLoadingState(store, 'getList');
      expect(loadingState.sequence).toBe(1);
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.response).toEqual({ id: 123, data: 'success' });
    });

    it('should handle action lifecycle with error', () => {
      // Initiate action
      initiateAction(store, 'create');
      let loadingState = getLoadingState(store, 'create');
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.error).toBeNull();

      // Error occurs
      const error = new Error('Something went wrong');
      actionError(store, 'create', error);
      loadingState = getLoadingState(store, 'create');
      expect(loadingState.isLoading).toBe(false);
      expect(loadingState.error).toBe(error);
      expect(loadingState.sequence).toBe(1);
    });
  });
});
